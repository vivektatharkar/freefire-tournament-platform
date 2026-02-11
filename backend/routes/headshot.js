// backend/routes/headshot.js
import express from "express";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import sequelize from "../config/db.js";

import Headshot from "../models/Headshot.js";
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
    console.error("HEADSHOT AUTH ERROR:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
}

/* --------------------- LIST -------------------------- */
// GET /api/headshot
router.get("/", async (req, res) => {
  try {
    const matches = await Headshot.findAll({ order: [["date", "ASC"]] });

    const ids = matches.map((m) => m.id);
    const participations = await Participation.findAll({
      where: { headshot_id: { [Op.in]: ids } },
      attributes: ["headshot_id"],
    });

    const countMap = {};
    participations.forEach((p) => {
      countMap[p.headshot_id] = (countMap[p.headshot_id] || 0) + 1;
    });

    const result = matches.map((m) => {
      const json = m.toJSON();
      json.joined_count = countMap[m.id] || 0;
      return json;
    });

    res.json(result);
  } catch (err) {
    console.error("GET /api/headshot error:", err);
    res.status(500).json({ message: "Failed to fetch headshot matches" });
  }
});

/* ------------------- JOINED / MY --------------------- */
// GET /api/headshot/joined/my
router.get("/joined/my", authMiddleware, async (req, res) => {
  try {
    const rows = await Participation.findAll({
      where: { user_id: req.user.id, headshot_id: { [Op.ne]: null } },
      attributes: ["headshot_id"],
    });

    res.json(rows.map((r) => r.headshot_id));
  } catch (err) {
    console.error("GET /api/headshot/joined/my error:", err);
    res.status(500).json({ message: "Failed to load joined headshot matches" });
  }
});

/* ------------------- HISTORY / MY --------------------- */
// GET /api/headshot/history/my
router.get("/history/my", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await sequelize.query(
      `
      SELECT
        p.id AS participation_id,
        p.user_id,
        p.headshot_id,
        COALESCE(ts.score, p.score) AS score,
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
      INNER JOIN headshot m ON m.id = p.headshot_id
      LEFT JOIN team_scores ts
        ON ts.match_type = 'headshot'
       AND ts.match_id = p.headshot_id
       AND ts.group_no IS NULL
       AND ts.team_id = p.user_id
      WHERE p.user_id = :uid
      ORDER BY m.date DESC
      `,
      { replacements: { uid: userId } }
    );

    const history = (rows || []).map((r) => ({
      headshot_id: r.m_id,
      name: r.name,
      date: r.date,
      mode: "headshot",
      entry_fee: r.entry_fee,
      price_pool: r.prize_pool,
      status: r.status,
      match_status: r.match_status || null,
      score: Number(r.score || 0),
      team_side: r.team_side || null,
      is_team_leader: !!r.is_team_leader,
      table: {
        type: "solo",
        rows: [{ player_name: "You", score: Number(r.score || 0) }],
      },
    }));

    res.json({ history });
  } catch (err) {
    console.error("GET /api/headshot/history/my error:", err);
    res.status(500).json({ message: "Failed to load headshot history" });
  }
});

/* ----------------------- JOIN ------------------------ */
// POST /api/headshot/:id/join
router.post("/:id/join", authMiddleware, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const matchId = Number(req.params.id);
    const userId = req.user.id;
    const teamSide = req.body.team_side === "B" ? "B" : "A";

    const match = await Headshot.findByPk(matchId, { transaction: t });
    if (!match) {
      await t.rollback();
      return res.status(404).json({ message: "Headshot match not found" });
    }

    const currentCount = await Participation.count({
      where: { headshot_id: matchId },
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
      where: { user_id: userId, headshot_id: matchId },
      transaction: t,
    });

    if (exists) {
      await t.rollback();
      return res.status(400).json({ message: "Already joined headshot" });
    }

    const leaderExists = await Participation.findOne({
      where: { headshot_id: matchId, team_side: teamSide, is_team_leader: true },
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
        description: `Joined headshot match #${matchId}`,
      },
      { transaction: t }
    );

    await Participation.create(
      { user_id: userId, headshot_id: matchId, team_side: teamSide, is_team_leader: isLeader },
      { transaction: t }
    );

    await t.commit();
    res.json({
      message: "Joined headshot match successfully",
      wallet_balance: user.wallet_balance,
      team_side: teamSide,
      is_team_leader: isLeader,
      joined_count: currentCount + 1,
      slots: match.slots,
    });
  } catch (err) {
    await t.rollback();
    console.error("POST /api/headshot/:id/join error:", err);
    res.status(500).json({ message: "Failed to join headshot match" });
  }
});

/* ------------------ PARTICIPANTS --------------------- */
// GET /api/headshot/:id/participants
router.get("/:id/participants", authMiddleware, async (req, res) => {
  try {
    const matchId = Number(req.params.id);

    const rows = await Participation.findAll({
      where: { headshot_id: matchId },
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

    const match = await Headshot.findByPk(matchId);

    // also try to read custom team names from team_scores (group_no 1 & 2)
    const teamNameRows = await TeamScore.findAll({
      where: {
        match_type: "headshot",
        match_id: matchId,
        group_no: { [Op.in]: [1, 2] },
        team_id: null,
      },
    });

    const team_a_name =
      teamNameRows.find((r) => Number(r.group_no) === 1)?.team_name || null;
    const team_b_name =
      teamNameRows.find((r) => Number(r.group_no) === 2)?.team_name || null;

    res.json({
      participants,
      joined_count: participants.length,
      slots: match?.slots ?? null,
      team_a_name,
      team_b_name,
    });
  } catch (err) {
    console.error("GET /api/headshot/:id/participants error:", err);
    res.status(500).json({ message: "Failed to load participants" });
  }
});

/* ---------------- LEADERBOARD (ALL USERS) ---------------- */
// GET /api/headshot/:id/leaderboard
router.get("/:id/leaderboard", authMiddleware, async (req, res) => {
  try {
    const matchId = Number(req.params.id);

    const match = await Headshot.findByPk(matchId);
    if (!match) return res.status(404).json({ message: "Headshot match not found" });

    const teamNameRows = await TeamScore.findAll({
      where: {
        match_type: "headshot",
        match_id: matchId,
        team_id: null,
        group_no: { [Op.in]: [1, 2] },
      },
      order: [["group_no", "ASC"]],
    });

    const team_a_name =
      teamNameRows.find((r) => Number(r.group_no) === 1)?.team_name || null;
    const team_b_name =
      teamNameRows.find((r) => Number(r.group_no) === 2)?.team_name || null;

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
        ON ts.match_type = 'headshot'
       AND ts.match_id = p.headshot_id
       AND ts.group_no IS NULL
       AND ts.team_id = p.user_id
      WHERE p.headshot_id = :mid
      ORDER BY score DESC, p.id ASC
      `,
      { replacements: { mid: matchId } }
    );

    res.json({
      match: {
        id: match.id,
        name: match.name,
        date: match.date,
        status: match.status,
        entry_fee: match.entry_fee,
        price_pool: match.prize_pool,
        team_a_name,
        team_b_name,
      },
      type: "headshot",
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
    });
  } catch (err) {
    console.error("GET /api/headshot/:id/leaderboard error:", err);
    res.status(500).json({ message: "Failed to load leaderboard" });
  }
});

/* --------------- TEAM NAME UPDATE -------------------- */
// PATCH /api/headshot/:id/team-name
// body: { team_side: "A" | "B", name: string }
router.patch("/:id/team-name", authMiddleware, async (req, res) => {
  try {
    const matchId = Number(req.params.id);
    const { team_side, name } = req.body || {};

    if (!["A", "B"].includes(team_side)) {
      return res.status(400).json({ message: "Invalid team side" });
    }

    const trimmed = String(name || "").trim();
    if (!trimmed) {
      return res.status(400).json({ message: "Team name is required" });
    }

    const match = await Headshot.findByPk(matchId);
    if (!match) return res.status(404).json({ message: "Headshot match not found" });

    // only leader of that side can update
    const participation = await Participation.findOne({
      where: {
        user_id: req.user.id,
        headshot_id: matchId,
        team_side,
        is_team_leader: true,
      },
    });

    if (!participation) {
      return res
        .status(403)
        .json({ message: "Only team leader can update team name" });
    }

    const group_no = team_side === "A" ? 1 : 2;

    const [row] = await TeamScore.findOrCreate({
      where: {
        match_type: "headshot",
        match_id: matchId,
        group_no,
        team_id: null,
      },
      defaults: {
        team_name: trimmed,
        score: 0,
        rank: null,
      },
    });

    await row.update({ team_name: trimmed });

    // read both sides' names so frontend can set team_a_name / team_b_name
    const nameRows = await TeamScore.findAll({
      where: {
        match_type: "headshot",
        match_id: matchId,
        team_id: null,
        group_no: { [Op.in]: [1, 2] },
      },
    });

    const team_a_name =
      nameRows.find((r) => Number(r.group_no) === 1)?.team_name || null;
    const team_b_name =
      nameRows.find((r) => Number(r.group_no) === 2)?.team_name || null;

    res.json({
      message: "Team name updated",
      team_side,
      team_a_name,
      team_b_name,
    });
  } catch (err) {
    console.error("PATCH /api/headshot/:id/team-name error:", err);
    res.status(500).json({ message: "Failed to update team name" });
  }
});

/* ---------------------- DETAILS ---------------------- */
// GET /api/headshot/:id/details
router.get("/:id/details", authMiddleware, async (req, res) => {
  try {
    const matchId = Number(req.params.id);

    const match = await Headshot.findByPk(matchId);
    if (!match) return res.status(404).json({ message: "Headshot match not found" });

    const joined = await Participation.findOne({
      where: { user_id: req.user.id, headshot_id: matchId },
    });

    if (!joined) {
      return res
        .status(403)
        .json({ message: "You must join this match to see room details" });
    }

    if (!match.room_id || !match.room_password) {
      return res.status(400).json({ message: "Room not configured yet" });
    }

    res.json({
      matchId: match.id,
      name: match.name,
      room_id: match.room_id,
      room_password: match.room_password,
    });
  } catch (err) {
    console.error("GET /api/headshot/:id/details error:", err);
    res.status(500).json({ message: "Failed to load headshot details" });
  }
});

export default router;