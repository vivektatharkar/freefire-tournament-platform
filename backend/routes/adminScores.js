// backend/routes/adminScores.js
import express from "express";
import jwt from "jsonwebtoken";
import sequelize from "../config/db.js";
import { Participation, Team, User } from "../models/index.js";

const router = express.Router();

/* ------------------------ ADMIN AUTH ------------------------ */
/**
 * IMPORTANT: Replace admin check with your real logic (role in JWT / users table).
 */
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret");

    // If you store role in JWT, enable:
    // if (decoded.role !== "admin") return res.status(403).json({ message: "Admin only" });

    req.admin = { id: decoded.id };
    next();
  } catch (err) {
    console.error("ADMIN AUTH ERROR:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
}

/* --------------------- HELPERS ----------------------- */
function assertType(type) {
  const t = String(type || "").toLowerCase();
  if (!["br", "b2b", "cs", "headshot"].includes(t)) return null;
  return t;
}

function whereForParticipation(type, matchId, userId) {
  const mid = Number(matchId);
  const uid = Number(userId);

  if (type === "br") return { user_id: uid, tournament_id: mid };
  if (type === "b2b") return { user_id: uid, b2b_id: mid };
  if (type === "cs") return { user_id: uid, cs_id: mid };
  if (type === "headshot") return { user_id: uid, headshot_id: mid };
  return null;
}

function whereForMatch(type, matchId) {
  const mid = Number(matchId);
  if (type === "br") return { tournament_id: mid };
  if (type === "b2b") return { b2b_id: mid };
  if (type === "cs") return { cs_id: mid };
  if (type === "headshot") return { headshot_id: mid };
  return null;
}

function teamForeignKeyForB2B() {
  // Newer flow uses teams.b2b_id
  if (Team?.rawAttributes?.b2b_id) return "b2b_id";
  // Older flow uses teams.tournament_id
  return "tournament_id";
}

/* ============================================================
   NEW: LIST PARTICIPANTS (Admin helper)
   ============================================================ */
// GET /api/admin/scores/participants?type=cs&match_id=12
router.get("/scores/participants", adminAuth, async (req, res) => {
  try {
    const type = assertType(req.query.type);
    const matchId = Number(req.query.match_id);

    if (!type) return res.status(400).json({ message: "Invalid type" });
    if (!matchId) return res.status(400).json({ message: "match_id required" });

    const where = whereForMatch(type, matchId);
    if (!where) return res.status(400).json({ message: "Invalid type" });

    const rows = await Participation.findAll({
      where,
      order: [["id", "ASC"]],
      attributes: ["id", "user_id", "score", "match_status", "team_side", "is_team_leader"],
    });

    const userIds = [...new Set((rows || []).map((r) => r.user_id))];
    const users = userIds.length
      ? await User.findAll({ where: { id: userIds }, attributes: ["id", "name", "game_id"] })
      : [];

    const uMap = {};
    for (const u of users) uMap[u.id] = u;

    // prevent caching in admin screens
    res.set("Cache-Control", "no-store");

    res.json({
      type,
      match_id: matchId,
      participants: (rows || []).map((r, idx) => ({
        index: idx + 1,
        participation_id: r.id,
        user_id: r.user_id,
        name: uMap[r.user_id]?.name || "Unknown",
        game_id: uMap[r.user_id]?.game_id || "",
        score: Number(r.score || 0),
        match_status: r.match_status ?? null,
        team_side: r.team_side ?? null,
        is_team_leader: !!r.is_team_leader,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/scores/participants error:", err);
    res.status(500).json({ message: "Failed to load participants" });
  }
});

/* ============================================================
   SOLO SCORE (participations.score)
   Works: BR, B2B (solo), CS, Headshot
   ============================================================ */
// PUT /api/admin/scores/solo
// body: { type, match_id, user_id, score, match_status? }
router.put("/scores/solo", adminAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const type = assertType(req.body.type);
    if (!type) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid type" });
    }

    const matchId = Number(req.body.match_id);
    const userId = Number(req.body.user_id);
    const score = Number(req.body.score || 0);

    if (!matchId || !userId) {
      await t.rollback();
      return res.status(400).json({ message: "match_id and user_id required" });
    }

    const where = whereForParticipation(type, matchId, userId);

    const row = await Participation.findOne({ where, transaction: t });
    if (!row) {
      await t.rollback();
      return res.status(404).json({ message: "Participation not found" });
    }

    row.score = score;
    if (req.body.match_status !== undefined) row.match_status = req.body.match_status;

    await row.save({ transaction: t });

    await t.commit();

    // prevent caching in admin screens
    res.set("Cache-Control", "no-store");

    res.json({
      message: "Score updated",
      participation_id: row.id,
      score: Number(row.score || 0),
      match_status: row.match_status ?? null,
    });
  } catch (err) {
    await t.rollback();
    console.error("PUT /api/admin/scores/solo error:", err);
    res.status(500).json({ message: "Failed to update score" });
  }
});

/* ============================================================
   NEW: BULK SOLO UPDATE (Admin helper)
   ============================================================ */
// PUT /api/admin/scores/solo/bulk
// body: { type, match_id, rows: [{ user_id, score, match_status? }] }
router.put("/scores/solo/bulk", adminAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const type = assertType(req.body.type);
    const matchId = Number(req.body.match_id);
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];

    if (!type) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid type" });
    }
    if (!matchId) {
      await t.rollback();
      return res.status(400).json({ message: "match_id required" });
    }
    if (!rows.length) {
      await t.rollback();
      return res.status(400).json({ message: "rows required" });
    }

    const updated = [];
    for (const r of rows) {
      const userId = Number(r.user_id);
      if (!userId) continue;

      const where = whereForParticipation(type, matchId, userId);
      const p = await Participation.findOne({ where, transaction: t });
      if (!p) continue;

      p.score = Number(r.score || 0);
      if (r.match_status !== undefined) p.match_status = r.match_status;

      await p.save({ transaction: t });
      updated.push({ user_id: userId, participation_id: p.id, score: Number(p.score || 0) });
    }

    await t.commit();
    res.set("Cache-Control", "no-store");

    res.json({
      message: "Bulk scores updated",
      match_id: matchId,
      type,
      updated_count: updated.length,
      updated,
    });
  } catch (err) {
    await t.rollback();
    console.error("PUT /api/admin/scores/solo/bulk error:", err);
    res.status(500).json({ message: "Failed to bulk update scores" });
  }
});

/* ============================================================
   TEAM SCORE (teams.score)
   Works: B2B duo/squad team leaderboard
   ============================================================ */
// PUT /api/admin/scores/team
// body: { tournament_id, team_id? OR group_no?, score, team_name? }
router.put("/scores/team", adminAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const tournamentId = Number(req.body.tournament_id);
    const teamId = req.body.team_id ? Number(req.body.team_id) : null;
    const groupNo = req.body.group_no ? Number(req.body.group_no) : null;
    const score = Number(req.body.score || 0);

    if (!tournamentId) {
      await t.rollback();
      return res.status(400).json({ message: "tournament_id required" });
    }
    if (!teamId && !groupNo) {
      await t.rollback();
      return res.status(400).json({ message: "team_id or group_no required" });
    }

    // support both schema styles:
    const fk = teamForeignKeyForB2B(); // "b2b_id" OR "tournament_id"

    let team = null;
    if (teamId) {
      team = await Team.findByPk(teamId, { transaction: t });
    } else {
      team = await Team.findOne({
        where: { [fk]: tournamentId, group_no: groupNo },
        transaction: t,
      });
    }

    if (!team) {
      await t.rollback();
      return res.status(404).json({ message: "Team not found" });
    }

    team.score = score;
    if (req.body.team_name !== undefined) team.team_name = req.body.team_name || "";

    await team.save({ transaction: t });

    await t.commit();
    res.set("Cache-Control", "no-store");

    res.json({
      message: "Team score updated",
      team_id: team.id,
      tournament_id: Number(team[fk]),
      group_no: Number(team.group_no),
      team_name: team.team_name,
      score: Number(team.score || 0),
      fk_used: fk, // extra debug; frontend can ignore
    });
  } catch (err) {
    await t.rollback();
    console.error("PUT /api/admin/scores/team error:", err);
    res.status(500).json({ message: "Failed to update team score" });
  }
});

export default router;