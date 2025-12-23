// backend/routes/b2b.js
import express from "express";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import sequelize from "../config/db.js";

import B2BMatch from "../models/B2BMatch.js";
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret");
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    console.error("B2B AUTH ERROR:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
}

/* --------------------- LIST -------------------------- */
// GET /api/b2b
router.get("/", async (req, res) => {
  try {
    const rows = await B2BMatch.findAll({
      order: [["date", "ASC"]],
    });
    res.json(rows);
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
      where: {
        user_id: req.user.id,
        b2b_id: { [Op.ne]: null },
      },
      attributes: ["b2b_id"],
    });

    res.json(rows.map((r) => r.b2b_id));
  } catch (err) {
    console.error("GET /api/b2b/joined/my error:", err);
    res.status(500).json({ message: "Failed to load joined B2B matches" });
  }
});

/* ----------------------- JOIN ------------------------ */
// POST /api/b2b/:id/join
router.post("/:id/join", authMiddleware, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const matchId = Number(req.params.id);
    const userId = req.user.id;

    const match = await B2BMatch.findByPk(matchId);
    if (!match) {
      await t.rollback();
      return res.status(404).json({ message: "B2B match not found" });
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
      return res.json({ message: "Already joined B2B match" });
    }

    // 💰 Deduct wallet
    user.wallet_balance = Number(user.wallet_balance) - entryFee;
    await user.save({ transaction: t });

    // 🧾 Debit transaction
    await Payment.create(
      {
        user_id: userId,
        amount: -entryFee,
        type: "debit",
        status: "success",
        description: `Joined B2B match #${matchId}`,
      },
      { transaction: t }
    );

    // 👤 Participation
    await Participation.create(
      {
        user_id: userId,
        b2b_id: matchId,
      },
      { transaction: t }
    );

    await t.commit();
    res.json({
      message: "Joined B2B match successfully",
      wallet_balance: user.wallet_balance,
    });
  } catch (err) {
    await t.rollback();
    console.error("POST /api/b2b/:id/join error:", err);
    res.status(500).json({ message: "Failed to join B2B match" });
  }
});

/* --------------------- DETAILS ----------------------- */
// GET /api/b2b/:id/details
router.get("/:id/details", authMiddleware, async (req, res) => {
  try {
    const match = await B2BMatch.findByPk(req.params.id);
    if (!match) {
      return res.status(404).json({ message: "B2B match not found" });
    }

    const joined = await Participation.findOne({
      where: { user_id: req.user.id, b2b_id: match.id },
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
    });
  } catch (err) {
    console.error("GET /api/b2b/:id/details error:", err);
    res.status(500).json({ message: "Failed to load details" });
  }
});

/* ------------------ PARTICIPANTS --------------------- */
// GET /api/b2b/:id/participants
router.get("/:id/participants", async (req, res) => {
  try {
    const matchId = Number(req.params.id);

    const rows = await Participation.findAll({
      where: { b2b_id: matchId },
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
      };
    });

    res.json({ participants });
  } catch (err) {
    console.error("GET /api/b2b/:id/participants error:", err);
    res.status(500).json({ message: "Failed to load participants" });
  }
});

export default router;