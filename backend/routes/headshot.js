// backend/routes/headshot.js
import express from "express";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import sequelize from "../config/db.js";

import Headshot from "../models/Headshot.js";
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
    console.error("HEADSHOT AUTH ERROR:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
}

/* --------------------- LIST -------------------------- */
// GET /api/headshot
router.get("/", async (req, res) => {
  try {
    const matches = await Headshot.findAll({
      order: [["date", "ASC"]],
    });

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
      where: {
        user_id: req.user.id,
        headshot_id: { [Op.ne]: null },
      },
      attributes: ["headshot_id"],
    });

    res.json(rows.map((r) => r.headshot_id));
  } catch (err) {
    console.error("GET /api/headshot/joined/my error:", err);
    res.status(500).json({ message: "Failed to load joined headshot matches" });
  }
});

/* ----------------------- JOIN ------------------------ */
// POST /api/headshot/:id/join
// body: { team_side: "A" | "B" }
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

    // slots limit
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
      return res
        .status(400)
        .json({ message: "Insufficient wallet balance" });
    }

    const exists = await Participation.findOne({
      where: { user_id: userId, headshot_id: matchId },
      transaction: t,
    });

    if (exists) {
      await t.rollback();
      return res.status(400).json({ message: "Already joined headshot" });
    }

    // team leader per side
    const leaderExists = await Participation.findOne({
      where: {
        headshot_id: matchId,
        team_side: teamSide,
        is_team_leader: true,
      },
      transaction: t,
    });

    const isLeader = !leaderExists;

    // deduct wallet
    user.wallet_balance = Number(user.wallet_balance) - entryFee;
    await user.save({ transaction: t });

    // payment
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

    // participation
    await Participation.create(
      {
        user_id: userId,
        headshot_id: matchId,
        team_side: teamSide,
        is_team_leader: isLeader,
      },
      { transaction: t }
    );

    const newCount = currentCount + 1;

    await t.commit();
    res.json({
      message: "Joined headshot match successfully",
      wallet_balance: user.wallet_balance,
      team_side: teamSide,
      is_team_leader: isLeader,
      joined_count: newCount,
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

    res.json({
      participants,
      joined_count: participants.length,
      slots: match?.slots ?? null,
    });
  } catch (err) {
    console.error("GET /api/headshot/:id/participants error:", err);
    res.status(500).json({ message: "Failed to load participants" });
  }
});

/* ---------------------- DETAILS ---------------------- */
// GET /api/headshot/:id/details
// Used by “Headshot CS match details” screen to show room info
router.get("/:id/details", authMiddleware, async (req, res) => {
  try {
    const matchId = Number(req.params.id);

    const match = await Headshot.findByPk(matchId);
    if (!match) {
      return res.status(404).json({ message: "Headshot match not found" });
    }

    const joined = await Participation.findOne({
      where: { user_id: req.user.id, headshot_id: matchId },
    });

    if (!joined) {
      return res.status(403).json({
        message: "You must join this match to see room details",
      });
    }

    if (!match.room_id || !match.room_password) {
      return res
        .status(400)
        .json({ message: "Room not configured yet" });
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