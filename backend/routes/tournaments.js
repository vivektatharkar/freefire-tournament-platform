// backend/routes/tournaments.js
import express from "express";
import sequelize from "../config/db.js";
import { Op } from "sequelize"; // ✅ FIX: use Op from sequelize package
import { auth } from "../middleware/auth.js";

import Tournament from "../models/Tournament.js";
import { User, Participation, Payment, Team, TeamMember } from "../models/index.js";

const router = express.Router();

function getTeamConfig(modeRaw) {
  const m = String(modeRaw || "").toLowerCase();
  if (m === "duo") return { mode: "duo", groupCount: 24, playersPerGroup: 2 };
  if (m === "squad") return { mode: "squad", groupCount: 12, playersPerGroup: 4 };
  return { mode: m, groupCount: 0, playersPerGroup: 0 };
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function noCache(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

async function isAdminUser(req) {
  const u = await User.findByPk(req.user?.id);
  const role = String(u?.role || "").toLowerCase();
  const email = String(u?.email || "").toLowerCase();
  const adminEmails = ["vivektatharkar@gmail.com"];
  return role === "admin" || adminEmails.includes(email);
}

/* --------------------- LIST (UPDATED, NO BREAK) -------------------------- */
/**
 * Returns tournaments (same as before) but adds:
 * - SOLO: joined_count
 * - DUO/SQUAD: teams_joined, players_joined, total_teams, total_players, group_size, groups_count
 */
router.get("/", async (req, res) => {
  try {
    noCache(res);

    const tournaments = await Tournament.findAll({ order: [["date", "ASC"]] });
    const ids = tournaments.map((t) => Number(t.id)).filter(Boolean);

    // joined_count for SOLO
    const soloCountMap = {};
    if (ids.length) {
      const [countRows] = await sequelize.query(
        `
        SELECT tournament_id, COUNT(*) AS cnt
        FROM participations
        WHERE tournament_id IN (:ids)
        GROUP BY tournament_id
        `,
        { replacements: { ids } }
      );
      (countRows || []).forEach((r) => {
        soloCountMap[Number(r.tournament_id)] = Number(r.cnt || 0);
      });
    }

    // teams_joined / players_joined for DUO/SQUAD
    const teamJoinedMap = {};
    const playerJoinedMap = {};
    if (ids.length) {
      const [teamCountRows] = await sequelize.query(
        `
        SELECT tournament_id, COUNT(*) AS teams_joined
        FROM teams
        WHERE tournament_id IN (:ids) AND leader_user_id IS NOT NULL
        GROUP BY tournament_id
        `,
        { replacements: { ids } }
      );
      (teamCountRows || []).forEach((r) => {
        teamJoinedMap[Number(r.tournament_id)] = Number(r.teams_joined || 0);
      });

      const [playerCountRows] = await sequelize.query(
        `
        SELECT t.tournament_id, COUNT(tm.id) AS players_joined
        FROM team_members tm
        INNER JOIN teams t ON t.id = tm.team_id
        WHERE t.tournament_id IN (:ids)
        GROUP BY t.tournament_id
        `,
        { replacements: { ids } }
      );
      (playerCountRows || []).forEach((r) => {
        playerJoinedMap[Number(r.tournament_id)] = Number(r.players_joined || 0);
      });
    }

    const result = tournaments.map((t) => {
      const json = t.toJSON();
      const mode = String(json.mode || "").toLowerCase();
      const cfg = getTeamConfig(mode);
      const isTeamMode = cfg.mode === "duo" || cfg.mode === "squad";

      if (isTeamMode) {
        json.teams_joined = teamJoinedMap[Number(json.id)] || 0;
        json.players_joined = playerJoinedMap[Number(json.id)] || 0;
        json.total_teams = cfg.groupCount;
        json.total_players = cfg.groupCount * cfg.playersPerGroup;
        json.group_size = cfg.playersPerGroup;
        json.groups_count = cfg.groupCount;
      } else {
        json.joined_count = soloCountMap[Number(json.id)] || 0;
      }

      return json;
    });

    return res.json(result);
  } catch (err) {
    console.error("GET /api/tournaments error:", err);
    return res.status(500).json({ message: "Failed to fetch tournaments" });
  }
});

/* ------------------- JOINED / MY --------------------- */
router.get("/joined/my", auth, async (req, res) => {
  try {
    const rows = await Participation.findAll({
      where: { user_id: req.user.id },
      attributes: ["tournament_id"],
    });
    res.json(rows.map((r) => r.tournament_id));
  } catch (err) {
    console.error("GET /api/tournaments/joined/my error:", err);
    res.status(500).json({ message: "Failed to fetch joined tournaments" });
  }
});

/* ------------------- HISTORY / MY -------------------- */
router.get("/history/my", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await sequelize.query(
      `
      SELECT
        p.id AS participation_id,
        p.user_id,
        p.tournament_id,
        p.score AS solo_score,
        p.match_status,
        t.id AS t_id,
        t.name,
        t.date,
        t.entry_fee,
        t.price_pool,
        t.status,
        t.mode
      FROM participations p
      INNER JOIN tournaments t ON t.id = p.tournament_id
      WHERE p.user_id = :uid
      ORDER BY t.date DESC
      `,
      { replacements: { uid: userId } }
    );

    const history = [];

    for (const r of rows) {
      const mode = String(r.mode || "").toLowerCase();
      const isTeamMode = mode === "duo" || mode === "squad";

      if (!isTeamMode) {
        history.push({
          tournament_id: r.t_id,
          name: r.name,
          date: r.date,
          mode: r.mode,
          entry_fee: r.entry_fee,
          price_pool: r.price_pool,
          status: r.status,
          match_status: r.match_status || null,
          score: Number(r.solo_score || 0),
          table: {
            type: "solo",
            rows: [{ player_name: "You", score: Number(r.solo_score || 0) }],
          },
        });
        continue;
      }

      const [teamRows] = await sequelize.query(
        `
        SELECT
          tm.team_id,
          t2.group_no,
          t2.team_name,
          t2.score AS team_score
        FROM team_members tm
        INNER JOIN teams t2 ON t2.id = tm.team_id
        WHERE tm.user_id = :uid AND t2.tournament_id = :tid
        LIMIT 1
        `,
        { replacements: { uid: userId, tid: r.t_id } }
      );

      if (!teamRows || teamRows.length === 0) {
        history.push({
          tournament_id: r.t_id,
          name: r.name,
          date: r.date,
          mode: r.mode,
          entry_fee: r.entry_fee,
          price_pool: r.price_pool,
          status: r.status,
          match_status: r.match_status || null,
          score: 0,
          table: {
            type: mode,
            group_no: null,
            team_name: "",
            team_score: 0,
            players: [],
          },
        });
        continue;
      }

      const teamInfo = teamRows[0];

      const [memberRows] = await sequelize.query(
        `
        SELECT slot_no, username, player_game_id
        FROM team_members
        WHERE team_id = :teamId
        ORDER BY slot_no ASC
        `,
        { replacements: { teamId: teamInfo.team_id } }
      );

      history.push({
        tournament_id: r.t_id,
        name: r.name,
        date: r.date,
        mode: r.mode,
        entry_fee: r.entry_fee,
        price_pool: r.price_pool,
        status: r.status,
        match_status: r.match_status || null,
        score: Number(teamInfo.team_score || 0),
        table: {
          type: mode,
          group_no: Number(teamInfo.group_no),
          team_name: teamInfo.team_name || "",
          team_score: Number(teamInfo.team_score || 0),
          players: (memberRows || []).map((m) => ({
            slot_no: Number(m.slot_no),
            username: m.username || "Unknown",
            player_game_id: m.player_game_id || "",
          })),
        },
      });
    }

    res.json({ history });
  } catch (err) {
    console.error("GET /api/tournaments/history/my error:", err);
    res.status(500).json({ message: "Failed to load history" });
  }
});

/* ---------------- LEADERBOARD (ALL USERS) ---------------- */
router.get("/:id/leaderboard", auth, async (req, res) => {
  try {
    const tournamentId = Number(req.params.id);

    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });

    const mode = String(tournament.mode || "").toLowerCase();
    const isTeamMode = mode === "duo" || mode === "squad";

    if (!isTeamMode) {
      const [rows] = await sequelize.query(
        `
        SELECT
          p.id AS participation_id,
          p.user_id,
          u.name,
          u.game_id,
          p.score,
          p.match_status
        FROM participations p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.tournament_id = :tid
        ORDER BY p.score DESC, p.id ASC
        `,
        { replacements: { tid: tournamentId } }
      );

      return res.json({
        tournament: {
          id: tournament.id,
          name: tournament.name,
          date: tournament.date,
          mode: tournament.mode,
          status: tournament.status,
          entry_fee: tournament.entry_fee,
          price_pool: tournament.price_pool,
        },
        type: "solo",
        rows: (rows || []).map((r, idx) => ({
          rank: idx + 1,
          user_id: r.user_id,
          name: r.name || "Unknown",
          game_id: r.game_id || "",
          score: Number(r.score || 0),
          match_status: r.match_status || null,
        })),
      });
    }

    const [teamRows] = await sequelize.query(
      `
      SELECT
        t.id AS team_id,
        t.group_no,
        t.team_name,
        t.score AS team_score
      FROM teams t
      WHERE t.tournament_id = :tid
      ORDER BY t.score DESC, t.group_no ASC
      `,
      { replacements: { tid: tournamentId } }
    );

    const teamIds = (teamRows || []).map((x) => x.team_id);
    const membersByTeam = {};

    if (teamIds.length > 0) {
      const [memberRows] = await sequelize.query(
        `
        SELECT team_id, slot_no, username, player_game_id
        FROM team_members
        WHERE team_id IN (:teamIds)
        ORDER BY team_id ASC, slot_no ASC
        `,
        { replacements: { teamIds } }
      );

      for (const m of memberRows || []) {
        if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = [];
        membersByTeam[m.team_id].push({
          slot_no: Number(m.slot_no),
          username: m.username || "Unknown",
          player_game_id: m.player_game_id || "",
        });
      }
    }

    return res.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        date: tournament.date,
        mode: tournament.mode,
        status: tournament.status,
        entry_fee: tournament.entry_fee,
        price_pool: tournament.price_pool,
      },
      type: mode,
      teams: (teamRows || []).map((t, idx) => ({
        rank: idx + 1,
        team_id: t.team_id,
        group_no: Number(t.group_no),
        team_name: t.team_name || "",
        team_score: Number(t.team_score || 0),
        players: membersByTeam[t.team_id] || [],
      })),
    });
  } catch (err) {
    console.error("GET /api/tournaments/:id/leaderboard error:", err);
    res.status(500).json({ message: "Failed to load leaderboard" });
  }
});

/* ====================== ✅ NEW ADMIN APIs ====================== */
router.get("/:id/admin/leaderboard", auth, async (req, res) => {
  try {
    const tournamentId = Number(req.params.id);
    if (!(await isAdminUser(req))) return res.status(403).json({ message: "Admin only" });

    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });

    const mode = String(tournament.mode || "").toLowerCase();
    const isTeamMode = mode === "duo" || mode === "squad";

    if (!isTeamMode) {
      const [rows] = await sequelize.query(
        `
        SELECT
          p.user_id,
          u.name,
          u.game_id,
          p.score,
          p.match_status
        FROM participations p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.tournament_id = :tid
        ORDER BY p.score DESC, p.id ASC
        `,
        { replacements: { tid: tournamentId } }
      );

      return res.json({
        tournament_id: tournamentId,
        mode,
        type: "solo",
        rows: (rows || []).map((r, idx) => ({
          rank: idx + 1,
          user_id: r.user_id,
          name: r.name || "Unknown",
          game_id: r.game_id || "",
          score: safeNum(r.score, 0),
          match_status: r.match_status || null,
        })),
      });
    }

    const [teamRows] = await sequelize.query(
      `
      SELECT id AS team_id, group_no, team_name, score AS team_score
      FROM teams
      WHERE tournament_id = :tid
      ORDER BY team_score DESC, group_no ASC
      `,
      { replacements: { tid: tournamentId } }
    );

    const teamIds = (teamRows || []).map((x) => x.team_id);
    const membersByTeam = {};

    if (teamIds.length > 0) {
      const [memberRows] = await sequelize.query(
        `
        SELECT team_id, slot_no, username, player_game_id, user_id
        FROM team_members
        WHERE team_id IN (:teamIds)
        ORDER BY team_id ASC, slot_no ASC
        `,
        { replacements: { teamIds } }
      );

      for (const m of memberRows || []) {
        if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = [];
        membersByTeam[m.team_id].push({
          slot_no: Number(m.slot_no),
          username: m.username || "Unknown",
          player_game_id: m.player_game_id || "",
          user_id: m.user_id,
        });
      }
    }

    return res.json({
      tournament_id: tournamentId,
      mode,
      type: mode,
      teams: (teamRows || []).map((t, idx) => ({
        rank: idx + 1,
        team_id: t.team_id,
        group_no: Number(t.group_no),
        team_name: t.team_name || "",
        team_score: safeNum(t.team_score, 0),
        players: membersByTeam[t.team_id] || [],
      })),
    });
  } catch (err) {
    console.error("GET /api/tournaments/:id/admin/leaderboard error:", err);
    res.status(500).json({ message: "Failed to load admin leaderboard" });
  }
});

router.put("/:id/admin/leaderboard/score", auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const tournamentId = Number(req.params.id);
    if (!(await isAdminUser(req))) {
      await t.rollback();
      return res.status(403).json({ message: "Admin only" });
    }

    const tournament = await Tournament.findByPk(tournamentId, { transaction: t });
    if (!tournament) {
      await t.rollback();
      return res.status(404).json({ message: "Tournament not found" });
    }

    const mode = String(tournament.mode || "").toLowerCase();
    const isTeamMode = mode === "duo" || mode === "squad";

    const score = Number(req.body.score);
    if (!Number.isFinite(score) || score < 0) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid score" });
    }

    if (!isTeamMode) {
      const user_id = Number(req.body.user_id);
      if (!Number.isFinite(user_id)) {
        await t.rollback();
        return res.status(400).json({ message: "Invalid user_id" });
      }

      await Participation.update(
        { score },
        { where: { tournament_id: tournamentId, user_id }, transaction: t }
      );

      await t.commit();
      return res.json({ message: "Solo score updated", tournament_id: tournamentId, user_id, score });
    }

    const team_id = Number(req.body.team_id);
    if (!Number.isFinite(team_id)) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid team_id" });
    }

    const team = await Team.findOne({
      where: { id: team_id, tournament_id: tournamentId },
      transaction: t,
    });
    if (!team) {
      await t.rollback();
      return res.status(404).json({ message: "Team not found" });
    }

    team.score = score;
    await team.save({ transaction: t });

    const members = await TeamMember.findAll({
      where: { team_id },
      attributes: ["user_id"],
      transaction: t,
    });

    const memberUserIds = (members || []).map((m) => m.user_id).filter(Boolean);

    if (memberUserIds.length > 0) {
      await Participation.update(
        { score },
        { where: { tournament_id: tournamentId, user_id: memberUserIds }, transaction: t }
      );
    }

    await t.commit();
    return res.json({ message: "Team score updated", tournament_id: tournamentId, team_id, score });
  } catch (err) {
    await t.rollback();
    console.error("PUT /api/tournaments/:id/admin/leaderboard/score error:", err);
    res.status(500).json({ message: "Failed to update score" });
  }
});

/* ----------------------- JOIN ------------------------ */
router.post("/:id/join", auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const tournamentId = Number(req.params.id);
    const userId = req.user.id;

    const tournament = await Tournament.findByPk(tournamentId, { transaction: t });
    if (!tournament) {
      await t.rollback();
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (tournament.is_locked) {
      await t.rollback();
      return res.status(400).json({ message: "Tournament is locked" });
    }

    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    const entryFee = Number(tournament.entry_fee || 0);
    if (Number(user.wallet_balance) < entryFee) {
      await t.rollback();
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    const exists = await Participation.findOne({
      where: { user_id: userId, tournament_id: tournamentId },
      transaction: t,
    });
    if (exists) {
      await t.rollback();
      return res.json({ message: "Already joined tournament" });
    }

    if (tournament.slots && Number(tournament.slots) > 0) {
      const count = await Participation.count({
        where: { tournament_id: tournamentId },
        transaction: t,
      });
      if (count >= Number(tournament.slots)) {
        await t.rollback();
        return res.status(400).json({ message: "Match is full" });
      }
    }

    user.wallet_balance = Number(user.wallet_balance) - entryFee;
    await user.save({ transaction: t });

    await Payment.create(
      {
        user_id: userId,
        tournament_id: tournamentId,
        amount: -entryFee,
        type: "debit",
        status: "success",
        description: `Tournament entry fee - ${tournament.name}`,
      },
      { transaction: t }
    );

    await Participation.create({ user_id: userId, tournament_id: tournamentId }, { transaction: t });

    await t.commit();

    let joined_count = null;
    if (tournament.slots && Number(tournament.slots) > 0) {
      joined_count = await Participation.count({ where: { tournament_id: tournamentId } });
    }

    res.json({
      message: "Tournament joined successfully",
      wallet_balance: user.wallet_balance,
      joined_count,
      slots: tournament.slots,
    });
  } catch (err) {
    await t.rollback();
    console.error("POST /api/tournaments/:id/join error:", err);
    res.status(500).json({ message: "Failed to join tournament" });
  }
});

/* --------------------- DETAILS ----------------------- */
router.get("/:id/details", auth, async (req, res) => {
  try {
    const tournamentId = Number(req.params.id);

    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });

    const joined = await Participation.findOne({
      where: { user_id: req.user.id, tournament_id: tournamentId },
    });

    if (!joined) {
      return res
        .status(403)
        .json({ message: "You must join this tournament to see room details" });
    }

    if (!tournament.room_id || !tournament.room_password) {
      return res.status(400).json({ message: "Room not configured yet" });
    }

    res.json({
      tournamentId: tournament.id,
      name: tournament.name,
      room_id: tournament.room_id,
      room_password: tournament.room_password,
    });
  } catch (err) {
    console.error("GET /api/tournaments/:id/details error:", err);
    res.status(500).json({ message: "Failed to load details" });
  }
});

/* ------------------ PARTICIPANTS --------------------- */
router.get("/:id/participants", auth, async (req, res) => {
  try {
    const tournamentId = Number(req.params.id);

    const [rows] = await sequelize.query(
      `
      SELECT p.id, u.name, u.game_id, u.email
      FROM participations p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.tournament_id = :tid
      ORDER BY p.id ASC
      `,
      { replacements: { tid: tournamentId } }
    );

    const participants = rows.map((r, idx) => ({
      id: r.id,
      index: idx + 1,
      name: r.name || "Unknown",
      freefireId: r.game_id || "",
      email: r.email || "",
    }));

    res.json({ participants });
  } catch (err) {
    console.error("GET /api/tournaments/:id/participants error:", err);
    res.status(500).json({ message: "Failed to load participants" });
  }
});

/* ------------------ TEAM TABLE APIs ------------------ */
router.get("/:id/teams", auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const tournamentId = Number(req.params.id);
    const userId = req.user.id;

    const tournament = await Tournament.findByPk(tournamentId, { transaction: t });
    if (!tournament) {
      await t.rollback();
      return res.status(404).json({ message: "Tournament not found" });
    }

    const joined = await Participation.findOne({
      where: { user_id: userId, tournament_id: tournamentId },
      transaction: t,
    });
    if (!joined) {
      await t.rollback();
      return res.status(403).json({ message: "You must join this tournament first" });
    }

    const cfg = getTeamConfig(tournament.mode);
    if (!["duo", "squad"].includes(cfg.mode)) {
      await t.rollback();
      return res.status(400).json({ message: "Team table available only for duo/squad mode" });
    }

    let teams = await Team.findAll({
      where: { tournament_id: tournamentId },
      order: [["group_no", "ASC"]],
      transaction: t,
    });

    if (!teams || teams.length === 0) {
      const toCreate = [];
      for (let g = 1; g <= cfg.groupCount; g++) {
        toCreate.push({
          tournament_id: tournamentId,
          group_no: g,
          team_name: "",
          leader_user_id: null,
          mode: cfg.mode,
        });
      }
      await Team.bulkCreate(toCreate, { transaction: t });

      teams = await Team.findAll({
        where: { tournament_id: tournamentId },
        order: [["group_no", "ASC"]],
        transaction: t,
      });
    }

    const teamIds = teams.map((tm) => tm.id);

    const members = await TeamMember.findAll({
      where: { team_id: teamIds },
      order: [["slot_no", "ASC"]],
      transaction: t,
    });

    const memberByTeam = {};
    members.forEach((m) => {
      if (!memberByTeam[m.team_id]) memberByTeam[m.team_id] = [];
      memberByTeam[m.team_id].push(m);
    });

    const user_has_team = members.some((m) => Number(m.user_id) === Number(userId));

    const groups = [];
    for (let g = 1; g <= cfg.groupCount; g++) {
      const team = teams.find((x) => x.group_no === g);
      const tmMembers = team ? memberByTeam[team.id] || [] : [];

      const players = [];
      for (let slot = 1; slot <= cfg.playersPerGroup; slot++) {
        const mem = tmMembers.find((x) => Number(x.slot_no) === Number(slot));
        if (mem) {
          players.push({
            username: mem.username || "Unknown",
            player_game_id: mem.player_game_id || "",
            user_id: mem.user_id,
          });
        } else {
          players.push({ username: null, player_game_id: null, user_id: null });
        }
      }

      groups.push({
        group_no: g,
        team_name: team?.team_name || "",
        leader_user_id: team?.leader_user_id || null,
        players,
      });
    }

    const teams_joined = teams.filter((x) => !!x.leader_user_id).length;
    const players_joined = members.length;

    const total_teams = cfg.groupCount;
    const total_players = cfg.groupCount * cfg.playersPerGroup;

    const resultTeams = teams.map((tm) => {
      const tmMembers = memberByTeam[tm.id] || [];
      const hasMe = tmMembers.some((m) => Number(m.user_id) === Number(userId));

      const membersView = tmMembers.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        username: m.username,
        player_game_id: m.player_game_id,
        slot_no: m.slot_no,
        is_me: Number(m.user_id) === Number(userId),
      }));

      return {
        id: tm.id,
        group_no: tm.group_no,
        team_name: tm.team_name,
        leader_user_id: tm.leader_user_id,
        is_leader: Number(tm.leader_user_id) === Number(userId),
        has_me: hasMe,
        members: membersView,
      };
    });

    await t.commit();

    res.json({
      locked: !!tournament.is_locked,
      mode: cfg.mode,
      teams_joined,
      total_teams,
      players_joined,
      total_players,
      groups,
      group_size: cfg.playersPerGroup,
      groups_count: cfg.groupCount,
      user_has_team,
      teams: resultTeams,
    });
  } catch (err) {
    await t.rollback();
    console.error("GET /api/tournaments/:id/teams error:", err);
    res.status(500).json({ message: "Failed to load team table" });
  }
});

/* ------------------ SELECT SLOT ------------------ */
router.post("/:id/teams/:group(\\d+)/slot/:slot(\\d+)", auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const tournamentId = Number(req.params.id);
    const groupNo = Number(req.params.group);
    const slotNo = Number(req.params.slot);
    const userId = req.user.id;

    const tournament = await Tournament.findByPk(tournamentId, { transaction: t });
    if (!tournament) {
      await t.rollback();
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (tournament.is_locked) {
      await t.rollback();
      return res.status(400).json({ message: "Tournament is locked" });
    }

    const joined = await Participation.findOne({
      where: { user_id: userId, tournament_id: tournamentId },
      transaction: t,
    });
    if (!joined) {
      await t.rollback();
      return res.status(403).json({ message: "You must join this tournament first" });
    }

    const cfg = getTeamConfig(tournament.mode);
    if (!["duo", "squad"].includes(cfg.mode)) {
      await t.rollback();
      return res.status(400).json({ message: "Team slots only for duo/squad" });
    }

    if (groupNo < 1 || groupNo > cfg.groupCount) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid group number" });
    }

    if (slotNo < 1 || slotNo > cfg.playersPerGroup) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid slot number" });
    }

    const existing = await TeamMember.findOne({
      where: { user_id: userId },
      include: [{ model: Team, as: "team", required: true, where: { tournament_id: tournamentId } }],
      transaction: t,
    });
    if (existing) {
      await t.rollback();
      return res.status(400).json({ message: "Already in another team" });
    }

    let team = await Team.findOne({
      where: { tournament_id: tournamentId, group_no: groupNo },
      transaction: t,
    });

    if (!team) {
      team = await Team.create(
        {
          tournament_id: tournamentId,
          group_no: groupNo,
          team_name: "",
          leader_user_id: null,
          mode: cfg.mode,
        },
        { transaction: t }
      );
    }

    const slotTaken = await TeamMember.findOne({
      where: { team_id: team.id, slot_no: slotNo },
      transaction: t,
    });
    if (slotTaken) {
      await t.rollback();
      return res.status(400).json({ message: "Slot already taken" });
    }

    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    const newMember = await TeamMember.create(
      {
        team_id: team.id,
        user_id: userId,
        slot_no: slotNo,
        username: user.name || "Unknown",
        player_game_id: user.game_id || "",
      },
      { transaction: t }
    );

    if (!team.leader_user_id) {
      team.leader_user_id = userId;
      await team.save({ transaction: t });
    }

    await t.commit();
    res.json({ message: "Slot selected successfully", member_id: newMember.id });
  } catch (err) {
    await t.rollback();
    console.error("POST /api/tournaments/:id/teams/:group/slot/:slot error:", err);
    res.status(500).json({ message: "Failed to select slot" });
  }
});

router.put("/:id/teams/:group(\\d+)/name", auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const tournamentId = Number(req.params.id);
    const groupNo = Number(req.params.group);
    const userId = req.user.id;
    const team_name = String(req.body?.team_name || "").trim();

    if (!team_name || team_name.length < 3) {
      await t.rollback();
      return res.status(400).json({ message: "Team name must be 3+ characters" });
    }

    const tournament = await Tournament.findByPk(tournamentId, { transaction: t });
    if (!tournament) {
      await t.rollback();
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (tournament.is_locked) {
      await t.rollback();
      return res.status(400).json({ message: "Tournament is locked" });
    }

    const joined = await Participation.findOne({
      where: { user_id: userId, tournament_id: tournamentId },
      transaction: t,
    });
    if (!joined) {
      await t.rollback();
      return res.status(403).json({ message: "You must join this tournament first" });
    }

    const team = await Team.findOne({
      where: { tournament_id: tournamentId, group_no: groupNo },
      transaction: t,
    });
    if (!team) {
      await t.rollback();
      return res.status(404).json({ message: "Team not found" });
    }

    if (Number(team.leader_user_id) !== Number(userId)) {
      await t.rollback();
      return res.status(403).json({ message: "Only team leader can update team name" });
    }

    team.team_name = team_name;
    await team.save({ transaction: t });

    await t.commit();
    res.json({ message: "Team name updated" });
  } catch (err) {
    await t.rollback();
    console.error("PUT /api/tournaments/:id/teams/:group/name error:", err);
    res.status(500).json({ message: "Failed to update team name" });
  }
});

router.post("/:id/teams/select-slot", auth, async (req, res) => {
  return res.status(410).json({
    message: "Deprecated. Use POST /api/tournaments/:id/teams/:group/slot/:slot",
  });
});

router.post("/:id/teams/update-name", auth, async (req, res) => {
  return res.status(410).json({
    message: "Deprecated. Use PUT /api/tournaments/:id/teams/:group/name",
  });
});

export default router;