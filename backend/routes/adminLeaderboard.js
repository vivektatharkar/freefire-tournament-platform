// backend/routes/adminLeaderboard.js
import express from "express";
import sequelize from "../config/db.js";

import { auth } from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

import TeamScore from "../models/TeamScore.js";
import Participation from "../models/Participation.js";
import Tournament from "../models/Tournament.js";
import { User, Team, TeamMember } from "../models/index.js";

const router = express.Router();

// ✅ Protect ALL admin leaderboard APIs
router.use(auth, isAdmin);

const ALLOWED_MATCH_TYPES = new Set(["tournament", "b2b", "cs", "headshot"]);
const isDev = (process.env.NODE_ENV || "development") !== "production";

const norm = (v) => (v ?? "").toString().trim();
const normLower = (v) => norm(v).toLowerCase();

function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toIdOrNull(v) {
  // ✅ IMPORTANT: treat 0 as null to prevent identity_key mismatch (t:0 vs t:null)
  const n = toNumberOrNull(v);
  if (n === null) return null;
  if (n === 0) return null;
  return n;
}

function matchColumn(matchType) {
  if (matchType === "tournament") return "tournament_id";
  if (matchType === "b2b") return "b2b_id";
  if (matchType === "cs") return "cs_id";
  if (matchType === "headshot") return "headshot_id";
  return null;
}

function teamSupportsB2BId() {
  return !!Team?.rawAttributes?.b2b_id;
}

function normalizeGroupNo(group_no) {
  if (group_no === "" || group_no === undefined) return null;
  const n = toNumberOrNull(group_no);
  if (n === null) return null;
  if (n === 0) return null;
  return n;
}

function buildIdentityKey({ match_type, match_id, group_no, team_id }) {
  const mt = (match_type ?? "").toString();
  const mid = match_id ?? "";
  const g = group_no === null || group_no === undefined ? "null" : String(group_no);
  const t = team_id === null || team_id === undefined ? "null" : String(team_id);
  return `${mt}:${mid}:g:${g}:t:${t}`;
}

async function recomputeRanks({ match_type, match_id }, trx = null) {
  const rows = await TeamScore.findAll({
    where: { match_type, match_id },
    order: [
      ["score", "DESC"],
      ["id", "ASC"],
    ],
    transaction: trx,
    logging: isDev ? console.log : false,
  });

  let rank = 1;
  for (const r of rows) {
    await r.update({ rank }, { transaction: trx, logging: isDev ? console.log : false });
    rank += 1;
  }
}

async function findOrCreateByIdentity({
  match_type,
  match_id,
  group_no,
  team_id,
  defaults,
  trx,
}) {
  const identity_key = buildIdentityKey({ match_type, match_id, group_no, team_id });

  return TeamScore.findOrCreate({
    where: { identity_key },
    defaults: {
      identity_key,
      match_type,
      match_id,
      group_no: group_no ?? null,
      team_id: team_id ?? null,
      ...defaults,
    },
    transaction: trx,
    logging: isDev ? console.log : false,
  });
}

/**
 * B2B teams lookup (fallback to tournament_id)
 */
async function getB2BTeams(match_id) {
  let teams = [];

  if (teamSupportsB2BId()) {
    teams = await Team.findAll({
      where: { b2b_id: match_id },
      order: [["group_no", "ASC"]],
    });
  }

  if (!teams.length) {
    teams = await Team.findAll({
      where: { tournament_id: match_id },
      order: [["group_no", "ASC"]],
    });
  }

  return teams;
}

/**
 * ✅ Fix/seed B2B if incomplete
 */
async function seedOrFixB2B(match_id) {
  const teams = await getB2BTeams(match_id);

  const existingCount = await TeamScore.count({
    where: { match_type: "b2b", match_id },
    logging: isDev ? console.log : false,
  });

  if (existingCount >= teams.length) return 0;

  let created = 0;
  for (const t of teams) {
    const [_, wasCreated] = await findOrCreateByIdentity({
      match_type: "b2b",
      match_id,
      group_no: t.group_no,
      team_id: toIdOrNull(t.id),
      defaults: {
        team_name: t.team_name || `Team ${t.group_no}`,
        score: Number(t.score || 0),
        rank: null,
      },
    });
    if (wasCreated) created += 1;
  }

  await recomputeRanks({ match_type: "b2b", match_id });
  return created;
}

/**
 * Determine match mode for frontend
 */
async function detectMode({ match_type, match_id }) {
  if (match_type === "tournament") {
    const t = await Tournament.findByPk(match_id);
    return (t?.mode || "").toString().toLowerCase() || "";
  }

  if (match_type === "b2b") {
    const teams = await getB2BTeams(match_id);
    if (teams.length === 24) return "duo";
    if (teams.length === 12) return "squad";
    return "";
  }

  if (match_type === "cs" || match_type === "headshot") {
    const col = matchColumn(match_type);
    const count = await Participation.count({ where: { [col]: match_id } });
    if (count > 4) return "squad";
    return "duo";
  }

  return "";
}

/**
 * Seed TeamScore if empty (tournament/cs/headshot)
 */
async function seedIfEmpty({ match_type, match_id }) {
  const existing = await TeamScore.count({
    where: { match_type, match_id },
    logging: isDev ? console.log : false,
  });
  if (existing > 0) return 0;

  // Tournament
  if (match_type === "tournament") {
    const tournament = await Tournament.findByPk(match_id);
    if (!tournament) return 0;

    const mode = String(tournament.mode || "").toLowerCase();
    const isTeamMode = mode === "duo" || mode === "squad";

    if (isTeamMode) {
      const teams = await Team.findAll({
        where: { tournament_id: match_id },
        order: [["group_no", "ASC"]],
      });

      let created = 0;
      for (const t of teams) {
        const [_, wasCreated] = await findOrCreateByIdentity({
          match_type,
          match_id,
          group_no: t.group_no,
          team_id: toIdOrNull(t.id),
          defaults: {
            team_name: t.team_name || `Team ${t.group_no}`,
            score: Number(t.score || 0),
            rank: null,
          },
        });
        if (wasCreated) created += 1;
      }

      await recomputeRanks({ match_type, match_id });
      return created;
    }

    // solo tournament participants
    const parts = await Participation.findAll({
      where: { tournament_id: match_id },
      attributes: ["id", "user_id", "score"],
      order: [["id", "ASC"]],
    });

    let created = 0;
    for (const p of parts) {
      const [_, wasCreated] = await findOrCreateByIdentity({
        match_type,
        match_id,
        group_no: null,
        team_id: toIdOrNull(p.user_id),
        defaults: { team_name: null, score: Number(p.score || 0), rank: null },
      });
      if (wasCreated) created += 1;
    }

    await recomputeRanks({ match_type, match_id });
    return created;
  }

  // CS / Headshot: seed Team A/B
  if (match_type === "cs" || match_type === "headshot") {
    const col = matchColumn(match_type);
    const parts = await Participation.findAll({
      where: { [col]: match_id },
      attributes: ["id", "user_id", "team_side", "score"],
    });

    if (!parts.length) return 0;

    const hasSide = parts.some((p) => p.team_side === "A" || p.team_side === "B");
    if (!hasSide) return 0;

    // ✅ IMPORTANT: team_id must be NULL (not 0) for Team A/B rows
    await findOrCreateByIdentity({
      match_type,
      match_id,
      group_no: 1,
      team_id: null,
      defaults: { team_name: "Team A", score: 0, rank: null },
    });

    await findOrCreateByIdentity({
      match_type,
      match_id,
      group_no: 2,
      team_id: null,
      defaults: { team_name: "Team B", score: 0, rank: null },
    });

    await recomputeRanks({ match_type, match_id });
    return 2;
  }

  return 0;
}

/**
 * users index: users(name, game_id)
 */
async function fetchUsersIndex(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  const idx = {};
  if (!ids.length) return idx;

  const attrs = ["id"];
  if (User?.rawAttributes?.name) attrs.push("name");
  if (User?.rawAttributes?.game_id) attrs.push("game_id");

  const users = await User.findAll({
    where: { id: ids },
    attributes: attrs,
    raw: true,
  });

  for (const u of users) idx[u.id] = u;
  return idx;
}

async function fetchMembersByTeamIds(teamIds) {
  const ids = [...new Set((teamIds || []).filter(Boolean))];
  if (!ids.length) return [];

  return TeamMember.findAll({
    where: { team_id: ids }, // IN query supported [web:1104]
    attributes: ["id", "team_id", "user_id", "slot_no", "username", "player_game_id"],
    raw: true,
    order: [
      ["team_id", "ASC"],
      ["slot_no", "ASC"],
      ["id", "ASC"],
    ],
  });
}

/**
 * Build playersIndex
 */
async function buildPlayersIndex({ match_type, match_id }) {
  const index = {};

  try {
    // Tournament / B2B
    if (match_type === "tournament" || match_type === "b2b") {
      let teams = [];

      if (match_type === "tournament") {
        teams = await Team.findAll({
          where: { tournament_id: match_id },
          attributes: ["id", "group_no", "team_name"],
          order: [["group_no", "ASC"]],
          raw: true,
        });
      } else {
        teams = await getB2BTeams(match_id);
        teams = teams.map((t) => (t?.toJSON ? t.toJSON() : t));
      }

      const teamIds = teams.map((t) => t.id).filter(Boolean);
      const members = await fetchMembersByTeamIds(teamIds);

      const membersByTeam = {};
      for (const m of members) {
        if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = [];
        membersByTeam[m.team_id].push(m);
      }

      const userIds = members.map((m) => m.user_id).filter(Boolean);
      const usersIndex = await fetchUsersIndex(userIds);

      for (const t of teams) {
        const mems = membersByTeam[t.id] || [];
        index[`team:${t.id}`] = mems.map((m) => {
          const u = usersIndex[m.user_id] || {};
          return {
            slot_no: m.slot_no ?? 0,
            user_id: m.user_id ?? null,
            username: m.username || u.name || "",
            player_game_id: m.player_game_id || u.game_id || "",
          };
        });
        index[`group:${t.group_no}`] = index[`team:${t.id}`];
      }

      return index;
    }

    // CS / Headshot
    if (match_type === "cs" || match_type === "headshot") {
      const col = matchColumn(match_type);

      const participationRows = await Participation.findAll({
        where: { [col]: match_id },
        attributes: ["id", "user_id", "team_side", "slot_no"],
        raw: true,
        order: [["id", "ASC"]],
      });

      const usersIndex = await fetchUsersIndex(participationRows.map((p) => p.user_id));

      const A = [];
      const B = [];

      for (const p of participationRows) {
        const u = usersIndex[p.user_id] || {};
        const row = {
          slot_no: p.slot_no ?? 0,
          user_id: p.user_id ?? null,
          username: u.name || "",
          player_game_id: u.game_id || "",
          team_side: p.team_side || null,
        };
        if (p.team_side === "B") B.push(row);
        else A.push(row);
      }

      A.forEach((p, i) => {
        if (!p.slot_no) p.slot_no = i + 1;
      });
      B.forEach((p, i) => {
        if (!p.slot_no) p.slot_no = i + 1;
      });

      index["group:1"] = A;
      index["group:2"] = B;
      return index;
    }
  } catch (err) {
    if (isDev) console.error("buildPlayersIndex error:", err);
    return index;
  }

  return index;
}

/**
 * GET /api/admin/leaderboard
 */
router.get("/", async (req, res) => {
  try {
    const match_type = normLower(req.query.match_type);
    const match_id = toNumberOrNull(norm(req.query.match_id));

    if (!match_type || match_id === null) {
      return res.status(400).json({ message: "Params required" });
    }
    if (!ALLOWED_MATCH_TYPES.has(match_type)) {
      return res.status(400).json({ message: "Invalid match_type" });
    }

    // ✅ b2b special seeding
    if (match_type === "b2b") {
      await seedOrFixB2B(match_id);
    } else {
      await seedIfEmpty({ match_type, match_id });
    }

    const mode = await detectMode({ match_type, match_id });
    const playersIndex = await buildPlayersIndex({ match_type, match_id });

    const rows = await TeamScore.findAll({
      where: { match_type, match_id },
      order: [["rank", "ASC"], ["score", "DESC"]],
    });

    const teams = rows.map((r) => ({
      id: r.id,
      match_type: r.match_type,
      match_id: r.match_id,
      group_no: r.group_no,
      team_id: r.team_id,
      team_name: r.team_name,
      score: r.score ?? 0,
      rank: r.rank,
      players:
        playersIndex[`team:${r.team_id}`] ||
        playersIndex[`group:${r.group_no}`] ||
        [],
    }));

    return res.json({ mode, teams });
  } catch (err) {
    if (isDev) console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/admin/leaderboard/bulk-score
 */
router.put("/bulk-score", async (req, res) => {
  const trx = await sequelize.transaction();
  try {
    const { match_type, match_id, rows } = req.body;
    if (!match_type || !match_id || !Array.isArray(rows)) {
      await trx.rollback();
      return res.status(400).json({ message: "Invalid payload" });
    }
    if (!ALLOWED_MATCH_TYPES.has(match_type)) {
      await trx.rollback();
      return res.status(400).json({ message: "Invalid match_type" });
    }

    for (const rowData of rows) {
      const group_no = normalizeGroupNo(rowData.group_no);
      const team_id = toIdOrNull(rowData.team_id); // ✅ 0 -> null
      const score = toNumberOrNull(rowData.score) ?? 0;

      const [row] = await findOrCreateByIdentity({
        match_type,
        match_id,
        group_no,
        team_id,
        defaults: { score, rank: null },
        trx,
      });

      await row.update({ score }, { transaction: trx });

      const col = matchColumn(match_type);

      if (team_id) {
        await Participation.update(
          { score },
          { where: { [col]: match_id, user_id: team_id }, transaction: trx }
        );

        if (match_type === "tournament" || match_type === "b2b") {
          await Team.update({ score }, { where: { id: team_id }, transaction: trx });
        }
      } else if (group_no && (match_type === "cs" || match_type === "headshot")) {
        const side = group_no === 1 ? "A" : "B";
        await Participation.update(
          { score },
          { where: { [col]: match_id, team_side: side }, transaction: trx }
        );
      }
    }

    await trx.commit();
    await recomputeRanks({ match_type, match_id });
    res.json({ message: "Bulk scores saved" });
  } catch (err) {
    if (trx) await trx.rollback();
    if (isDev) console.error(err);
    res.status(500).json({ message: "Bulk save failed" });
  }
});

/**
 * PUT /api/admin/leaderboard/score
 */
router.put("/score", async (req, res) => {
  const trx = await sequelize.transaction();
  try {
    const { match_type, match_id, group_no, team_id, score } = req.body;

    if (!ALLOWED_MATCH_TYPES.has(match_type)) {
      await trx.rollback();
      return res.status(400).json({ message: "Invalid match_type" });
    }

    const gno = normalizeGroupNo(group_no);
    const tid = toIdOrNull(team_id); // ✅ 0 -> null
    const s = toNumberOrNull(score) ?? 0;

    const [row] = await findOrCreateByIdentity({
      match_type,
      match_id,
      group_no: gno,
      team_id: tid,
      defaults: { score: s, rank: null },
      trx,
    });

    await row.update({ score: s }, { transaction: trx });

    const col = matchColumn(match_type);

    if (tid) {
      await Participation.update(
        { score: s },
        { where: { [col]: match_id, user_id: tid }, transaction: trx }
      );

      if (match_type === "tournament" || match_type === "b2b") {
        await Team.update({ score: s }, { where: { id: tid }, transaction: trx });
      }
    } else if (gno && (match_type === "cs" || match_type === "headshot")) {
      const side = gno === 1 ? "A" : "B";
      await Participation.update(
        { score: s },
        { where: { [col]: match_id, team_side: side }, transaction: trx }
      );
    }

    await trx.commit();
    await recomputeRanks({ match_type, match_id });
    res.json({ message: "Score saved" });
  } catch (err) {
    if (trx) await trx.rollback();
    if (isDev) console.error(err);
    res.status(500).json({ message: "Save failed" });
  }
});

export default router;