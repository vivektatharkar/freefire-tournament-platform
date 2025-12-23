// controllers/tournamentController.js

import { Op } from "sequelize";
import { sequelize } from "../models/index.js";
import {
  User,
  Tournament,
  TournamentParticipant,
  Payment,
} from "../models/index.js";
import { notifyUser } from "../utils/notify.js";

/**
 * User joins a tournament
 * POST /api/tournaments/:tournamentId/join
 */
export const joinTournament = async (req, res) => {
  const userId = req.user.id; // or req.body.user_id depending on your auth
  const { tournamentId } = req.params;

  try {
    // 1) Load tournament
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    const entryFee = Number(tournament.entry_fee || tournament.entryFee || 0);

    // 2) Make sure user not already joined
    const existing = await TournamentParticipant.findOne({
      where: { user_id: userId, tournament_id: tournamentId },
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "You already joined this tournament" });
    }

    // 3) Run DB transaction (deduct wallet + create payment + create participant)
    const result = await sequelize.transaction(async (tx) => {
      // 3.1) Lock user row
      const userRow = await User.findByPk(userId, {
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      });

      if (!userRow) {
        throw new Error("User not found");
      }

      const currentBal = Number(
        userRow.wallet_balance ?? userRow.wallet ?? 0
      );

      if (currentBal < entryFee) {
        throw new Error("Insufficient balance");
      }

      // 3.2) Deduct wallet
      const newBalance = Number((currentBal - entryFee).toFixed(2));
      userRow.wallet_balance = newBalance;
      await userRow.save({ transaction: tx });

      // 3.3) Create Payment row for JOIN
      const payment = await Payment.create(
        {
          user_id: userId,
          tournament_id: tournamentId,
          amount: -entryFee, // negative = debit
          type: "tournament_join", // used later in admin report
          status: "success",
          description: `Tournament join fee (tournament_id=${tournamentId})`,
          transaction_id: `wallet_debit_${userId}_${Date.now()}`,
        },
        { transaction: tx }
      );

      // 3.4) Create participant record
      const participant = await TournamentParticipant.create(
        {
          user_id: userId,
          tournament_id: tournamentId,
          payment_id: payment.id,
          joined_at: new Date(),
        },
        { transaction: tx }
      );

      // 3.5) Optionally update joined count on tournament
      const joinedCount = await TournamentParticipant.count({
        where: { tournament_id: tournamentId },
        transaction: tx,
      });

      tournament.joined = joinedCount; // or any field that stores total joined
      await tournament.save({ transaction: tx });

      return { payment, participant, newBalance, userRow };
    });

    // 4) Send match join notification
    await notifyUser(
      userId,
      "match_join",
      `You have successfully joined "${tournament.name}" for ₹${entryFee}.`
    );

    return res.json({
      message: "Tournament joined successfully",
      wallet_balance: result.newBalance,
      payment_id: result.payment.id,
    });
  } catch (err) {
    console.error("joinTournament error", err);
    if (err.message === "Insufficient balance") {
      return res.status(400).json({ message: "Insufficient balance" });
    }
    return res.status(500).json({ message: "Failed to join tournament" });
  }
};

import { Payment as PaymentModel } from "../models/index.js";

export const getWalletHistory = async (req, res) => {
  try {
    const rows = await PaymentModel.findAll({
      where: {
        user_id: req.user.id,
        status: "success",
      },
      order: [["created_at", "DESC"]],
      attributes: [
        "id",
        "amount",
        "type",
        "status",
        "description",
        "created_at",
      ],
    });

    res.json(rows);
  } catch (err) {
    console.error("WALLET HISTORY ERROR:", err);
    res.status(500).json({ message: "Failed to load wallet history" });
  }
};