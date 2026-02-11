// backend/routes/cs.js
import express from "express";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import sequelize from "../config/db.js";

import CSMatch from "../models/CSMatch.js";
import TeamScore from "../models/TeamScore.js";
import { User, Participation, Payment } from "../models/index.js";

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
    console.error("CS AUTH ERROR:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
}

/* --------------------- LIST HELPERS -------------------------- */
async function buildMatchesList() {
  const matches = await CSMatch.findAll({
    order: [["date", "ASC"]],
  });

  const ids = matches.map((m) => m.id);

  const participations = ids.length
    ? await Participation.findAll({
        where: { cs_id: { [Op.in]: ids } },
        attributes: ["cs_id"],
      })
    : [];

  const countMap = {};
  participations.forEach((p) => {
    countMap[p.cs_id] = (countMap[p.cs_id] || 0) + 1;
  });

  return matches.map((m) => {
    const json = m.toJSON();
    json.joined_count = countMap[m.id] || 0;
    return json;
  });
}

/* --------------------- LIST -------------------------- */
// GET /api/cs/tournaments  (old flow: returns ARRAY)
router.get("/tournaments", async (req, res) => {
  try {
    const matches = await buildMatchesList();
    return res.json(matches);
  } catch (err) {
    console.error("GET /api/cs/tournaments error:", err);
    return res.status(500).json({ message: "Failed to fetch CS matches" });
  }
});

// GET /api/cs  (alias: returns ARRAY)
router.get("/", async (req, res) => {
  try {
    const matches = await buildMatchesList();
    return res.json(matches);
  } catch (err) {
    console.error("GET /api/cs error:", err);
    return res.status(500).json({ message: "Failed to fetch CS matches" });
  }
});

// Optional: wrapped list for other UI (kept)
router.get("/tournaments/wrapped", async (req, res) => {
  try {
    const matches = await buildMatchesList();
    return res.json({ matches });
  } catch (err) {
    console.error("GET /api/cs/tournaments/wrapped error:", err);
    return res.status(500).json({ message: "Failed to fetch CS matches" });
  }
});

/* ------------------- JOINED / MY --------------------- */
// GET /api/cs/joined/my
router.get("/joined/my", authMiddleware, async (req, res) => {
  try {
    const rows = await Participation.findAll({
      where: {
        user_id: req.user.id,
        cs_id: { [Op.ne]: null },
      },
      attributes: ["cs_id"],
    });

    return res.json(rows.map((r) => r.cs_id));
  } catch (err) {
    console.error("GET /api/cs/joined/my error:", err);
    return res.status(500).json({ message: "Failed to load joined CS matches" });
  }
});

/* ------------------- HISTORY / MY --------------------- */
// GET /api/cs/history/my
router.get("/history/my", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await sequelize.query(
      `
      SELECT
        p.id AS participation_id,
        p.user_id,
        p.cs_id,
        p.score,
        p.match_status,
        p.team_side,
        p.is_team_leader,
        m.id AS m_id,
        m.name,
        m.date,
        m.entry_fee,
        m.prize_pool,
        m.status
      FROM participations p
      INNER JOIN csmatches m ON m.id = p.cs_id
      WHERE p.user_id = :uid
      ORDER BY m.date DESC
      `,
      { replacements: { uid: userId } }
    );

    // prefer admin-controlled per-player score if exists in team_scores (per-player row)
    const csIds = [...new Set((rows || []).map((r) => Number(r.m_id)).filter(Boolean))];

    const teamScores = csIds.length
      ? await TeamScore.findAll({
          where: {
            match_type: "cs",
            match_id: { [Op.in]: csIds },
            team_id: userId,
            group_no: null,
          },
        })
      : [];

    const scoreMap = {};
    for (const ts of teamScores) scoreMap[Number(ts.match_id)] = Number(ts.score || 0);

    const history = (rows || []).map((r) => {
      const csId = Number(r.m_id);
      const scoreFromTeamScores =
        scoreMap[csId] !== undefined ? Number(scoreMap[csId]) : null;

      const finalScore =
        scoreFromTeamScores != null ? scoreFromTeamScores : Number(r.score || 0);

      return {
        cs_id: r.m_id,
        name: r.name,
        date: r.date,
        mode: "cs",
        entry_fee: r.entry_fee,
        price_pool: r.prize_pool,
        status: r.status,
        match_status: r.match_status || null,
        score: Number(finalScore || 0),
        team_side: r.team_side || null,
        is_team_leader: !!r.is_team_leader,
        table: {
          type: "solo",
          rows: [{ player_name: "You", score: Number(finalScore || 0) }],
        },
      };
    });

    return res.json({ history });
  } catch (err) {
    console.error("GET /api/cs/history/my error:", err);
    return res.status(500).json({ message: "Failed to load CS history" });
  }
});

/* ----------------------- JOIN ------------------------ */
// POST /api/cs/:id/join
router.post("/:id/join", authMiddleware, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const matchId = Number(req.params.id);
    const userId = req.user.id;
    const teamSide = req.body.team_side === "B" ? "B" : "A";

    const match = await CSMatch.findByPk(matchId, { transaction: t });
    if (!match) {
      await t.rollback();
      return res.status(404).json({ message: "CS match not found" });
    }

    const currentCount = await Participation.count({
      where: { cs_id: matchId },
      transaction: t,
    });

    if (currentCount >= match.slots) {
      await t.rollback();
      return res.status(400).json({ message: "Match is full" });
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
      where: { user_id: userId, cs_id: matchId },
      transaction: t,
    });

    if (exists) {
      await t.rollback();
      return res.status(400).json({ message: "Already joined CS match" });
    }

    const leaderExists = await Participation.findOne({
      where: { cs_id: matchId, team_side: teamSide, is_team_leader: true },
      transaction: t,
    });

    const isLeader = !leaderExists;

    user.wallet_balance = Number(user.wallet_balance) - entryFee;
    await user.save({ transaction: t });

    await Payment.create(
      {
        user_id: userId,
        amount: -entryFee,
        type: "debit",
        status: "success",
        description: `Joined CS match #${matchId}`,
      },
      { transaction: t }
    );

    await Participation.create(
      { user_id: userId, cs_id: matchId, team_side: teamSide, is_team_leader: isLeader },
      { transaction: t }
    );

    await t.commit();
    return res.json({
      message: "Joined CS match successfully",
      wallet_balance: user.wallet_balance,
      team_side: teamSide,
      is_team_leader: isLeader,
      joined_count: currentCount + 1,
      slots: match.slots,
    });
  } catch (err) {
    await t.rollback();
    console.error("POST /api/cs/:id/join error:", err);
    return res.status(500).json({ message: "Failed to join CS match" });
  }
});

/* --------------------- DETAILS ----------------------- */
// GET /api/cs/:id/details
router.get("/:id/details", authMiddleware, async (req, res) => {
  try {
    const match = await CSMatch.findByPk(req.params.id);
    if (!match) return res.status(404).json({ message: "CS match not found" });

    const joined = await Participation.findOne({
      where: { user_id: req.user.id, cs_id: match.id },
    });

    if (!joined) {
      return res.status(403).json({ message: "Join match to view room details" });
    }

    if (!match.room_id || !match.room_password) {
      return res.status(400).json({ message: "Room not configured yet" });
    }

    return res.json({
      room_id: match.room_id,
      room_password: match.room_password,
      date: match.date,
      team_a_name: match.team_a_name || null,
      team_b_name: match.team_b_name || null,
      my_team_side: joined.team_side || null,
      is_team_leader: joined.is_team_leader || false,
    });
  } catch (err) {
    console.error("GET /api/cs/:id/details error:", err);
    return res.status(500).json({ message: "Failed to load details" });
  }
});

/* ------------------ PARTICIPANTS --------------------- */
// GET /api/cs/:id/participants
router.get("/:id/participants", authMiddleware, async (req, res) => {
  try {
    const matchId = Number(req.params.id);

    const rows = await Participation.findAll({
      where: { cs_id: matchId },
      order: [["id", "ASC"]],
    });

    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const users = await User.findAll({ where: { id: userIds } });

    const map = {};
    users.forEach((u) => (map[u.id] = u));

    const participants = rows.map((row) => {
      const u = map[row.user_id];
      return {
        id: row.user_id,
        name: u?.name || "Unknown",
        freefireId: u?.game_id || "",
        team_side: row.team_side || null,
        is_team_leader: !!row.is_team_leader,
        is_me: row.user_id === req.user.id,
      };
    });

    const match = await CSMatch.findByPk(matchId);

    return res.json({
      participants,
      team_a_name: match?.team_a_name || null,
      team_b_name: match?.team_b_name || null,
      joined_count: participants.length,
      slots: match?.slots ?? null,
    });
  } catch (err) {
    console.error("GET /api/cs/:id/participants error:", err);
    return res.status(500).json({ message: "Failed to load participants" });
  }
});

/* ---------------- LEADERBOARD (PLAYERS ALWAYS) ---------------- */
// GET /api/cs/:id/leaderboard
router.get("/:id/leaderboard", authMiddleware, async (req, res) => {
  try {
    const matchId = Number(req.params.id);

    const match = await CSMatch.findByPk(matchId);
    if (!match) return res.status(404).json({ message: "CS match not found" });

    // Optional: team totals (A/B) if present (group_no 1/2)
    const teamRows = await TeamScore.findAll({
      where: {
        match_type: "cs",
        match_id: matchId,
        team_id: null,
        group_no: { [Op.in]: [1, 2] },
      },
      order: [["group_no", "ASC"]],
    });

    const team_summary =
      teamRows && teamRows.length
        ? {
            teamA: Number(teamRows.find((r) => Number(r.group_no) === 1)?.score || 0),
            teamB: Number(teamRows.find((r) => Number(r.group_no) === 2)?.score || 0),
          }
        : null;

    // ✅ ALWAYS return players in rows (this fixes your issue)
    // ✅ If admin sets per-player override in team_scores (group_no NULL), use it.
    const [rows] = await sequelize.query(
      `
      SELECT
        p.user_id,
        u.name,
        u.game_id,
        COALESCE(ts.score, p.score) AS score,
        p.match_status,
        p.team_side,
        p.is_team_leader
      FROM participations p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN team_scores ts
        ON ts.match_type = 'cs'
       AND ts.match_id = p.cs_id
       AND ts.group_no IS NULL
       AND ts.team_id = p.user_id
      WHERE p.cs_id = :mid
      ORDER BY score DESC, p.id ASC
      `,
      { replacements: { mid: matchId } }
    );

    return res.json({
      match: {
        id: match.id,
        name: match.name,
        date: match.date,
        status: match.status,
        entry_fee: match.entry_fee,
        price_pool: match.prize_pool,
        team_a_name: match.team_a_name || null,
        team_b_name: match.team_b_name || null,
      },
      type: "cs",
      rows: (rows || []).map((r, idx) => ({
        rank: idx + 1,
        user_id: r.user_id,
        name: r.name || "Unknown",
        game_id: r.game_id || "",
        score: Number(r.score || 0),
        match_status: r.match_status || null,
        team_side: r.team_side || null,
        is_team_leader: !!r.is_team_leader,
      })),
      team_summary, // optional, won’t break player table
      source: "participations+team_scores_override",
    });
  } catch (err) {
    console.error("GET /api/cs/:id/leaderboard error:", err);
    return res.status(500).json({ message: "Failed to load leaderboard" });
  }
});

/* --------------- TEAM NAME UPDATE -------------------- */
// PATCH /api/cs/:id/team-name
router.patch("/:id/team-name", authMiddleware, async (req, res) => {
  try {
    const matchId = Number(req.params.id);
    const { team_side, name } = req.body;

    if (!["A", "B"].includes(team_side)) {
      return res.status(400).json({ message: "Invalid team side" });
    }

    const match = await CSMatch.findByPk(matchId);
    if (!match) return res.status(404).json({ message: "CS match not found" });

    const participation = await Participation.findOne({
      where: {
        user_id: req.user.id,
        cs_id: matchId,
        team_side,
        is_team_leader: true,
      },
    });

    if (!participation) {
      return res.status(403).json({ message: "Only team leader can update team name" });
    }

    if (team_side === "A") match.team_a_name = name || null;
    else match.team_b_name = name || null;

    await match.save();

    return res.json({
      message: "Team name updated",
      team_a_name: match.team_a_name,
      team_b_name: match.team_b_name,
    });
  } catch (err) {
    console.error("PATCH /api/cs/:id/team-name error:", err);
    return res.status(500).json({ message: "Failed to update team name" });
  }
});

export default router;