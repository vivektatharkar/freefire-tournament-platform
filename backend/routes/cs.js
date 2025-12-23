// backend/routes/cs.js
import express from "express";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import sequelize from "../config/db.js";

import CSMatch from "../models/CSMatch.js";
import { User, Participation, Payment } from "../models/index.js";

const router = express.Router();

/* ------------------------ AUTH ------------------------ */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "supersecret"
    );
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    console.error("CS AUTH ERROR:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
}

/* --------------------- LIST -------------------------- */
// GET /api/cs/tournaments
// returns all matches with current joined count
router.get("/tournaments", async (req, res) => {
  try {
    const matches = await CSMatch.findAll({
      order: [["date", "ASC"]],
    });

    const ids = matches.map((m) => m.id);
    const participations = await Participation.findAll({
      where: { cs_id: { [Op.in]: ids } },
      attributes: ["cs_id"],
    });

    const countMap = {};
    participations.forEach((p) => {
      countMap[p.cs_id] = (countMap[p.cs_id] || 0) + 1;
    });

    const result = matches.map((m) => {
      const json = m.toJSON();
      json.joined_count = countMap[m.id] || 0;
      return json;
    });

    res.json(result);
  } catch (err) {
    console.error("GET /api/cs/tournaments error:", err);
    res.status(500).json({ message: "Failed to fetch CS matches" });
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

    res.json(rows.map((r) => r.cs_id));
  } catch (err) {
    console.error("GET /api/cs/joined/my error:", err);
    res.status(500).json({ message: "Failed to load joined CS matches" });
  }
});

/* ----------------------- JOIN ------------------------ */
// POST /api/cs/:id/join
// body: { team_side: "A" | "B" }
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

    // 1) enforce slot limit
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
      return res
        .status(400)
        .json({ message: "Insufficient wallet balance" });
    }

    const exists = await Participation.findOne({
      where: { user_id: userId, cs_id: matchId },
      transaction: t,
    });

    if (exists) {
      await t.rollback();
      return res.status(400).json({ message: "Already joined CS match" });
    }

    // check if there is already a leader for that team
    const leaderExists = await Participation.findOne({
      where: {
        cs_id: matchId,
        team_side: teamSide,
        is_team_leader: true,
      },
      transaction: t,
    });

    const isLeader = !leaderExists;

    // deduct wallet
    user.wallet_balance = Number(user.wallet_balance) - entryFee;
    await user.save({ transaction: t });

    // payment record
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

    // participation
    await Participation.create(
      {
        user_id: userId,
        cs_id: matchId,
        team_side: teamSide,
        is_team_leader: isLeader,
      },
      { transaction: t }
    );

    const newCount = currentCount + 1;

    await t.commit();
    res.json({
      message: "Joined CS match successfully",
      wallet_balance: user.wallet_balance,
      team_side: teamSide,
      is_team_leader: isLeader,
      joined_count: newCount,
      slots: match.slots,
    });
  } catch (err) {
    await t.rollback();
    console.error("POST /api/cs/:id/join error:", err);
    res.status(500).json({ message: "Failed to join CS match" });
  }
});

/* --------------------- DETAILS ----------------------- */
// GET /api/cs/:id/details
router.get("/:id/details", authMiddleware, async (req, res) => {
  try {
    const match = await CSMatch.findByPk(req.params.id);
    if (!match) {
      return res.status(404).json({ message: "CS match not found" });
    }

    const joined = await Participation.findOne({
      where: { user_id: req.user.id, cs_id: match.id },
    });

    if (!joined) {
      return res
        .status(403)
        .json({ message: "Join match to view room details" });
    }

    if (!match.room_id || !match.room_password) {
      return res.status(400).json({ message: "Room not configured yet" });
    }

    res.json({
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
    res.status(500).json({ message: "Failed to load details" });
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
    const users = await User.findAll({
      where: { id: userIds },
    });

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

    res.json({
      participants,
      team_a_name: match?.team_a_name || null,
      team_b_name: match?.team_b_name || null,
      joined_count: participants.length,
      slots: match?.slots ?? null,
    });
  } catch (err) {
    console.error("GET /api/cs/:id/participants error:", err);
    res.status(500).json({ message: "Failed to load participants" });
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
    if (!match) {
      return res.status(404).json({ message: "CS match not found" });
    }

    const participation = await Participation.findOne({
      where: {
        user_id: req.user.id,
        cs_id: matchId,
        team_side,
        is_team_leader: true,
      },
    });

    if (!participation) {
      return res
        .status(403)
        .json({ message: "Only team leader can update team name" });
    }

    if (team_side === "A") {
      match.team_a_name = name || null;
    } else {
      match.team_b_name = name || null;
    }

    await match.save();

    res.json({
      message: "Team name updated",
      team_a_name: match.team_a_name,
      team_b_name: match.team_b_name,
    });
  } catch (err) {
    console.error("PATCH /api/cs/:id/team-name error:", err);
    res.status(500).json({ message: "Failed to update team name" });
  }
});

export default router;