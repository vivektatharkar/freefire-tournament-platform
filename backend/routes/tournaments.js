// backend/routes/tournaments.js
import express from "express";
import Tournament from "../models/Tournament.js";
import Participation from "../models/Participation.js";
import { auth } from "../middleware/auth.js";
import sequelize from "../config/db.js";
import { User, Payment } from "../models/index.js";

// OPTIONAL: if you actually have a notify helper, uncomment and fix the path
// import { notifyUser } from "../utils/notifications.js";

const router = express.Router();

/* --------------------- LIST -------------------------- */
router.get("/", async (req, res) => {
  try {
    const tournaments = await Tournament.findAll({
      order: [["date", "ASC"]],
    });
    res.json(tournaments);
  } catch (err) {
    console.error("GET /api/tournaments error:", err);
    res.status(500).json({ message: "Failed to fetch tournaments" });
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

/* ----------------------- JOIN ------------------------ */
router.post("/:id/join", auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const tournamentId = Number(req.params.id);
    const userId = req.user.id;

    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      await t.rollback();
      return res.status(404).json({ message: "Tournament not found" });
    }

    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    const entryFee = Number(tournament.entry_fee || 0);

    if (Number(user.wallet_balance) < entryFee) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Insufficient wallet balance" });
    }

    const exists = await Participation.findOne({
      where: { user_id: userId, tournament_id: tournamentId },
      transaction: t,
    });

    if (exists) {
      await t.rollback();
      return res.json({ message: "Already joined tournament" });
    }

    // Deduct wallet
    user.wallet_balance = Number(user.wallet_balance) - entryFee;
    await user.save({ transaction: t });

    // Store payment as a negative debit
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

    // Create participation
    await Participation.create(
      {
        user_id: userId,
        tournament_id: tournamentId,
      },
      { transaction: t }
    );

    // Try to send notification only if helper exists
    try {
      if (typeof notifyUser === "function") {
        await notifyUser(
          userId,
          "tournament",
          `You joined ${tournament.name} successfully`,
          t
        );
      }
    } catch (notifyErr) {
      // Log but do not fail the join if notification fails
      console.error("notifyUser error (ignored):", notifyErr);
    }

    await t.commit();

    res.json({
      message: "Tournament joined successfully",
      wallet_balance: user.wallet_balance,
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
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    const joined = await Participation.findOne({
      where: { user_id: req.user.id, tournament_id: tournamentId },
    });

    if (!joined) {
      return res.status(403).json({
        message: "You must join this tournament to see room details",
      });
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
      SELECT
        p.id,
        u.name,
        u.game_id,
        u.email
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

export default router;