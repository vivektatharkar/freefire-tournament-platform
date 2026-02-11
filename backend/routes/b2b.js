// backend/routes/b2b.js
import express from "express";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import sequelize from "../config/db.js";

import B2BMatch from "../models/B2BMatch.js";
import TeamScore from "../models/TeamScore.js";

import { User, Participation, Payment, Team, TeamMember } from "../models/index.js";

const router = express.Router();

/* ------------------------ AUTH ------------------------ */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret");
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    console.error("B2B AUTH ERROR:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
}

/**
 * If you did NOT add teams.b2b_id yet, keep app working by falling back.
 * If you DID add it, team endpoints + team leaderboard will work.
 */
function teamSupportsB2BId() {
  return !!Team?.rawAttributes?.b2b_id;
}

/* --------------------- LIST -------------------------- */
// GET /api/b2b
// ✅ Updated: include team seat counts so frontend can show real-time seats
router.get("/", async (req, res) => {
  try {
    // base matches list
    const matches = await B2BMatch.findAll({ order: [["date", "ASC"]] });

    // if team mode not configured, just return matches as before
    if (!teamSupportsB2BId()) {
      return res.json(matches);
    }

    const ids = matches.map((m) => m.id);
    if (!ids.length) return res.json(matches);

    // aggregate teams + players per match in one query
    const [rows] = await sequelize.query(
      `
      SELECT
        t.b2b_id AS match_id,
        COUNT(DISTINCT CASE WHEN t.leader_user_id IS NOT NULL THEN t.id END) AS teams_joined,
        COUNT(DISTINCT t.id) AS total_teams,
        COUNT(DISTINCT tm.id) AS players_joined
      FROM teams t
      LEFT JOIN team_members tm ON tm.team_id = t.id
      WHERE t.b2b_id IN (:ids)
      GROUP BY t.b2b_id
      `,
      { replacements: { ids } }
    );

    const map = {};
    (rows || []).forEach((r) => {
      map[r.match_id] = {
        teams_joined: Number(r.teams_joined || 0),
        total_teams: Number(r.total_teams || 0),
        players_joined: Number(r.players_joined || 0),
      };
    });

    const result = matches.map((m) => {
      const mode = String(m.mode || "").toLowerCase();
      const isTeamMode = mode === "duo" || mode === "squad";

      if (!isTeamMode) return m; // solo – no change

      const agg = map[m.id] || {
        teams_joined: 0,
        total_teams: mode === "duo" ? 24 : 12,
        players_joined: 0,
      };

      const playersPerTeam = mode === "duo" ? 2 : 4;
      const totalPlayers =
        agg.total_teams && agg.total_teams > 0
          ? agg.total_teams * playersPerTeam
          : (mode === "duo" ? 24 : 12) * playersPerTeam;

      // plain JSON object; avoid adding Sequelize metadata
      return {
        ...m.toJSON(),
        teams_joined: agg.teams_joined,
        total_teams: agg.total_teams || (mode === "duo" ? 24 : 12),
        players_joined: agg.players_joined,
        total_players: totalPlayers,
      };
    });

    res.set("Cache-Control", "no-cache");
    return res.json(result);
  } catch (err) {
    console.error("GET /api/b2b error:", err);
    res.status(500).json({ message: "Failed to fetch B2B matches" });
  }
});

/* ------------------- JOINED / MY --------------------- */
// GET /api/b2b/joined/my
router.get("/joined/my", authMiddleware, async (req, res) => {
  try {
    const rows = await Participation.findAll({
      where: { user_id: req.user.id, b2b_id: { [Op.ne]: null } },
      attributes: ["b2b_id"],
    });

    // prevent caching joined/my so browser doesn't return 304 with stale data [page:2]
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    res.json(rows.map((r) => r.b2b_id));
  } catch (err) {
    console.error("GET /api/b2b/joined/my error:", err);
    res.status(500).json({ message: "Failed to load joined B2B matches" });
  }
});

/* ------------------- HISTORY / MY -------------------- */
// ... UNCHANGED CONTENT DOWNWARDS ...

router.get("/history/my", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await sequelize.query(
      `
      SELECT
        p.id AS participation_id,
        p.user_id,
        p.b2b_id,
        p.score AS solo_score,
        p.match_status,
        m.id AS m_id,
        m.name,
        m.date,
        m.entry_fee,
        m.prize_pool,
        m.status,
        m.mode
      FROM participations p
      INNER JOIN b2bmatches m ON m.id = p.b2b_id
      WHERE p.user_id = :uid
      ORDER BY m.date DESC
      `,
      { replacements: { uid: userId } }
    );

    const history = [];

    for (const r of rows || []) {
      const mode = String(r.mode || "").toLowerCase();
      const isTeamMode = mode === "duo" || mode === "squad";

      if (!isTeamMode || !teamSupportsB2BId()) {
        let scoreFromTeamScores = null;
        try {
          const ts = await TeamScore.findOne({
            where: {
              match_type: "b2b",
              match_id: Number(r.m_id),
              team_id: Number(userId),
              group_no: null,
            },
          });
          scoreFromTeamScores = ts ? Number(ts.score || 0) : null;
        } catch {}

        const finalScore =
          scoreFromTeamScores != null ? scoreFromTeamScores : Number(r.solo_score || 0);

        history.push({
          b2b_id: r.m_id,
          name: r.name,
          date: r.date,
          mode: r.mode,
          entry_fee: r.entry_fee,
          price_pool: r.prize_pool,
          status: r.status,
          match_status: r.match_status || null,
          score: Number(finalScore || 0),
          table: {
            type: "solo",
            rows: [{ player_name: "You", score: Number(finalScore || 0) }],
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
        WHERE tm.user_id = :uid AND t2.b2b_id = :mid
        LIMIT 1
        `,
        { replacements: { uid: userId, mid: r.m_id } }
      );

      if (!teamRows || teamRows.length === 0) {
        history.push({
          b2b_id: r.m_id,
          name: r.name,
          date: r.date,
          mode: r.mode,
          entry_fee: r.entry_fee,
          price_pool: r.prize_pool,
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
        b2b_id: r.m_id,
        name: r.name,
        date: r.date,
        mode: r.mode,
        entry_fee: r.entry_fee,
        price_pool: r.prize_pool,
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
    console.error("GET /api/b2b/history/my error:", err);
    res.status(500).json({ message: "Failed to load history" });
  }
});

/* ----------------------- JOIN ------------------------ */
// (join route unchanged)
router.post("/:id/join", authMiddleware, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const matchId = Number(req.params.id);
    const userId = req.user.id;

    const match = await B2BMatch.findByPk(matchId, { transaction: t });
    if (!match) {
      await t.rollback();
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (match.is_locked) {
      await t.rollback();
      return res.status(400).json({ message: "Tournament is locked" });
    }

    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    const entryFee = Number(match.entry_fee || 0);
    if (Number(user.wallet_balance) < entryFee) {
      await t.rollback();
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    const exists = await Participation.findOne({
      where: { user_id: userId, b2b_id: matchId },
      transaction: t,
    });
    if (exists) {
      await t.rollback();
      return res.json({ message: "Already joined tournament" });
    }

    if (match.slots && Number(match.slots) > 0) {
      const joinedCount = await Participation.count({
        where: { b2b_id: matchId },
        transaction: t,
      });
      if (joinedCount >= Number(match.slots)) {
        await t.rollback();
        return res.status(400).json({ message: "Match is full" });
      }
    }

    user.wallet_balance = Number(user.wallet_balance) - entryFee;
    await user.save({ transaction: t });

    await Payment.create(
      {
        user_id: userId,
        b2b_id: matchId,
        amount: -entryFee,
        type: "debit",
        status: "success",
        description: `B2B entry fee - ${match.name}`,
      },
      { transaction: t }
    );

    await Participation.create({ user_id: userId, b2b_id: matchId }, { transaction: t });

    await t.commit();

    let joined_count = null;
    if (match.slots && Number(match.slots) > 0) {
      joined_count = await Participation.count({ where: { b2b_id: matchId } });
    }

    res.json({
      message: "Joined tournament successfully",
      wallet_balance: user.wallet_balance,
      joined_count,
      slots: match.slots,
    });
  } catch (err) {
    await t.rollback();
    console.error("POST /api/b2b/:id/join error:", err);
    res.status(500).json({ message: "Failed to join tournament" });
  }
});

/* --------------------- DETAILS ----------------------- */
router.get("/:id/details", authMiddleware, async (req, res) => {
  try {
    const matchId = Number(req.params.id);

    const match = await B2BMatch.findByPk(matchId);
    if (!match) return res.status(404).json({ message: "Tournament not found" });

    const joined = await Participation.findOne({
      where: { user_id: req.user.id, b2b_id: matchId },
    });

    if (!joined) {
      return res
        .status(403)
        .json({ message: "You must join this tournament to see room details" });
    }

    if (!match.room_id || !match.room_password) {
      return res.status(400).json({ message: "Room not configured yet" });
    }

    res.json({
      tournamentId: match.id,
      name: match.name,
      room_id: match.room_id,
      room_password: match.room_password,
    });
  } catch (err) {
    console.error("GET /api/b2b/:id/details error:", err);
    res.status(500).json({ message: "Failed to load details" });
  }
});

/* ------------------ PARTICIPANTS --------------------- */
router.get("/:id/participants", authMiddleware, async (req, res) => {
  try {
    const matchId = Number(req.params.id);

    const rows = await Participation.findAll({
      where: { b2b_id: matchId },
      order: [["id", "ASC"]],
    });

    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const users = await User.findAll({ where: { id: userIds } });

    const map = {};
    users.forEach((u) => {
      map[u.id] = u;
    });

    const participants = rows.map((row, idx) => {
      const u = map[row.user_id];
      return {
        id: row.id,
        index: idx + 1,
        name: u?.name || "Unknown",
        freefireId: u?.game_id || "",
        email: u?.email || "",
      };
    });

    res.json({ participants });
  } catch (err) {
    console.error("GET /api/b2b/:id/participants error:", err);
    res.status(500).json({ message: "Failed to load participants" });
  }
});

/* ---------------- LEADERBOARD (ALL USERS) ---------------- */
// (leaderboard route unchanged)
router.get("/:id/leaderboard", authMiddleware, async (req, res) => {
  try {
    const matchId = Number(req.params.id);

    const match = await B2BMatch.findByPk(matchId);
    if (!match) return res.status(404).json({ message: "Tournament not found" });

    const mode = String(match.mode || "").toLowerCase();
    const isTeamMode = mode === "duo" || mode === "squad";

    const getSoloLeaderboard = async () => {
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
        WHERE p.b2b_id = :mid
        ORDER BY p.score DESC, p.id ASC
        `,
        { replacements: { mid: matchId } }
      );

      return {
        match: {
          id: match.id,
          name: match.name,
          date: match.date,
          mode: match.mode,
          status: match.status,
          entry_fee: match.entry_fee,
          price_pool: match.prize_pool,
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
      };
    };

    if (!isTeamMode) {
      return res.json(await getSoloLeaderboard());
    }

    if (!teamSupportsB2BId()) {
      const rows = await TeamScore.findAll({
        where: { match_type: "b2b", match_id: matchId },
        order: [
          ["rank", "ASC"],
          ["score", "DESC"],
          ["id", "ASC"],
        ],
      });

      const userIds = [...new Set(rows.map((r) => r.team_id).filter((x) => x != null))];
      const users = userIds.length
        ? await User.findAll({ where: { id: userIds }, attributes: ["id", "name", "game_id"] })
        : [];
      const uMap = {};
      for (const u of users) uMap[u.id] = u;

      return res.json({
        match: {
          id: match.id,
          name: match.name,
          date: match.date,
          mode: match.mode,
          status: match.status,
          entry_fee: match.entry_fee,
          price_pool: match.prize_pool,
        },
        type: "solo",
        rows: rows.map((r, idx) => {
          const u = uMap[r.team_id];
          return {
            rank: r.rank ?? idx + 1,
            user_id: r.team_id,
            name: u?.name || "Unknown",
            game_id: u?.game_id || "",
            score: Number(r.score || 0),
            match_status: null,
          };
        }),
        source: "team_scores",
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
      WHERE t.b2b_id = :mid
      ORDER BY t.score DESC, t.group_no ASC
      `,
      { replacements: { mid: matchId } }
    );

    if (!teamRows || teamRows.length === 0) {
      return res.json(await getSoloLeaderboard());
    }

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
      match: {
        id: match.id,
        name: match.name,
        date: match.date,
        mode: match.mode,
        status: match.status,
        entry_fee: match.entry_fee,
        price_pool: match.prize_pool,
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
    console.error("GET /api/b2b/:id/leaderboard error:", err);
    res.status(500).json({ message: "Failed to load leaderboard" });
  }
});

/* ------------------ TEAM ENDPOINTS ------------------- */
// (teams routes unchanged – your existing logic)
router.get("/:id/teams", authMiddleware, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const matchId = Number(req.params.id);
    const userId = req.user.id;

    const match = await B2BMatch.findByPk(matchId, { transaction: t });
    if (!match) {
      await t.rollback();
      return res.status(404).json({ message: "Tournament not found" });
    }

    const joined = await Participation.findOne({
      where: { user_id: userId, b2b_id: matchId },
      transaction: t,
    });
    if (!joined) {
      await t.rollback();
      return res.status(403).json({ message: "You must join this tournament first" });
    }

    const mode = (match.mode || "").toLowerCase();
    if (!["duo", "squad"].includes(mode)) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Team table available only for duo/squad mode" });
    }

    if (!teamSupportsB2BId()) {
      await t.rollback();
      return res.status(400).json({
        message: "B2B team mode is not configured on server (teams.b2b_id missing).",
      });
    }

    const groupCount = mode === "duo" ? 24 : 12;
    const playersPerGroup = mode === "duo" ? 2 : 4;

    let teams = await Team.findAll({
      where: { b2b_id: matchId },
      order: [["group_no", "ASC"]],
      transaction: t,
    });

    if (!teams || teams.length === 0) {
      const toCreate = [];
      for (let g = 1; g <= groupCount; g++) {
        toCreate.push({
          b2b_id: matchId,
          group_no: g,
          team_name: "",
          leader_user_id: null,
          mode,
          score: 0,
        });
      }
      await Team.bulkCreate(toCreate, { transaction: t });

      teams = await Team.findAll({
        where: { b2b_id: matchId },
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
    for (let g = 1; g <= groupCount; g++) {
      const team = teams.find((tm) => tm.group_no === g);
      const players = [];

      for (let i = 1; i <= playersPerGroup; i++) {
        const member =
          team && memberByTeam[team.id]
            ? memberByTeam[team.id].find((m) => Number(m.slot_no) === Number(i))
            : null;

        if (member) {
          players.push({
            username: member.username || "Unknown",
            player_game_id: member.player_game_id || "",
            user_id: member.user_id,
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

    const teams_joined = groups.filter((g) => !!g.leader_user_id).length;
    const players_joined = groups.reduce((sum, g) => {
      const filled = (g.players || []).filter((p) => !!p.user_id).length;
      return sum + filled;
    }, 0);

    const total_teams = groupCount;
    const total_players = groupCount * playersPerGroup;

    const resultTeams = teams.map((tm) => {
      const tmMembers = memberByTeam[tm.id] || [];
      const hasMe = tmMembers.some((m) => Number(m.user_id) === Number(userId));
      return {
        id: tm.id,
        group_no: tm.group_no,
        team_name: tm.team_name,
        leader_user_id: tm.leader_user_id,
        is_leader: Number(tm.leader_user_id) === Number(userId),
        has_me: hasMe,
        members: tmMembers.map((m) => ({
          id: m.id,
          user_id: m.user_id,
          username: m.username,
          player_game_id: m.player_game_id,
          slot_no: m.slot_no,
          is_me: Number(m.user_id) === Number(userId),
        })),
      };
    });

    await t.commit();

    res.json({
      groups,
      mode,
      locked: !!match.is_locked,

      teams_joined,
      total_teams,
      players_joined,
      total_players,

      user_has_team,
      teams: resultTeams,
      group_size: playersPerGroup,
      groups_count: groupCount,
    });
  } catch (err) {
    await t.rollback();
    console.error("GET /api/b2b/:id/teams error:", err);
    res.status(500).json({ message: "Failed to load teams" });
  }
});

router.post(
  "/:id/teams/:group(\\d+)/slot/:slot(\\d+)",
  authMiddleware,
  async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const matchId = Number(req.params.id);
      const groupNo = Number(req.params.group);
      const slotNo = Number(req.params.slot);
      const userId = req.user.id;

      const match = await B2BMatch.findByPk(matchId, { transaction: t });
      if (!match) {
        await t.rollback();
        return res.status(404).json({ message: "Tournament not found" });
      }

      if (match.is_locked) {
        await t.rollback();
        return res.status(400).json({ message: "Tournament locked" });
      }

      const mode = (match.mode || "").toLowerCase();
      const maxSlots = mode === "duo" ? 2 : 4;
      if (!["duo", "squad"].includes(mode)) {
        await t.rollback();
        return res.status(400).json({ message: "Team slots only for Duo/Squad" });
      }

      if (!teamSupportsB2BId()) {
        await t.rollback();
        return res.status(400).json({
          message: "B2B team mode is not configured on server (teams.b2b_id missing).",
        });
      }

      if (slotNo < 1 || slotNo > maxSlots) {
        await t.rollback();
        return res.status(400).json({ message: "Invalid slot number" });
      }

      const joined = await Participation.findOne({
        where: { user_id: userId, b2b_id: matchId },
        transaction: t,
      });
      if (!joined) {
        await t.rollback();
        return res.status(403).json({ message: "You must join this tournament first" });
      }

      let existingMembership = null;
      try {
        existingMembership = await TeamMember.findOne({
          include: [{ model: Team, as: "team", required: true, where: { b2b_id: matchId } }],
          where: { user_id: userId },
          transaction: t,
        });
      } catch (e) {
        const [rows] = await sequelize.query(
          `
          SELECT tm.id
          FROM team_members tm
          INNER JOIN teams t2 ON t2.id = tm.team_id
          WHERE tm.user_id = :uid AND t2.b2b_id = :mid
          LIMIT 1
          `,
          { replacements: { uid: userId, mid: matchId }, transaction: t }
        );
        existingMembership = rows && rows.length ? { id: rows[0].id } : null;
      }

      if (existingMembership) {
        await t.rollback();
        return res.status(400).json({ message: "Already in another team" });
      }

      let team = await Team.findOne({
        where: { b2b_id: matchId, group_no: groupNo },
        transaction: t,
      });

      if (!team) {
        team = await Team.create(
          {
            b2b_id: matchId,
            group_no: groupNo,
            team_name: `Team ${groupNo}`,
            leader_user_id: null,
            mode,
            score: 0,
          },
          { transaction: t }
        );
      }

      const existingSlot = await TeamMember.findOne({
        where: { team_id: team.id, slot_no: slotNo },
        transaction: t,
      });
      if (existingSlot) {
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

      const countMembers = await TeamMember.count({
        where: { team_id: team.id },
        transaction: t,
      });

      if (!team.leader_user_id && countMembers === 1) {
        team.leader_user_id = userId;
        await team.save({ transaction: t });
      }

      await t.commit();
      res.json({ message: "Slot selected successfully", member_id: newMember.id });
    } catch (err) {
      await t.rollback();
      console.error("POST /api/b2b/:id/teams/:group/slot/:slot error:", err);
      res.status(500).json({ message: "Failed to select slot" });
    }
  }
);

router.put("/:id/teams/:group(\\d+)/name", authMiddleware, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { team_name } = req.body;
    const matchId = Number(req.params.id);
    const groupNo = Number(req.params.group);
    const userId = req.user.id;

    if (!team_name || String(team_name).trim().length < 3) {
      await t.rollback();
      return res.status(400).json({ message: "Team name must be 3+ characters" });
    }

    const match = await B2BMatch.findByPk(matchId, { transaction: t });
    if (!match) {
      await t.rollback();
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (match.is_locked) {
      await t.rollback();
      return res.status(400).json({ message: "Tournament locked" });
    }

    if (!teamSupportsB2BId()) {
      await t.rollback();
      return res.status(400).json({
        message: "B2B team mode is not configured on server (teams.b2b_id missing).",
      });
    }

    const team = await Team.findOne({
      where: { b2b_id: matchId, group_no: groupNo },
      transaction: t,
    });
    if (!team) {
      await t.rollback();
      return res.status(404).json({ message: "Team not found" });
    }

    if (Number(team.leader_user_id) !== Number(userId)) {
      await t.rollback();
      return res.status(403).json({ message: "Only team leader can edit name" });
    }

    team.team_name = String(team_name).trim();
    await team.save({ transaction: t });

    await t.commit();
    res.json({ message: "Team name updated" });
  } catch (err) {
    await t.rollback();
    console.error("PUT /api/b2b/:id/teams/:group/name error:", err);
    res.status(500).json({ message: "Failed to update team name" });
  }
});

export default router;