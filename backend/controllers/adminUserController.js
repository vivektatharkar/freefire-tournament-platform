// backend/controllers/adminUserController.js

import { Op } from "sequelize";
import { User, Payment } from "../models/index.js";

/**
 * GET /api/admin/users/:userId/activity
 *
 * Returns:
 * {
 *   user: { id, name, email, phone },
 *   wallet_balance: number,
 *   total_credit: number,
 *   total_debit: number,             // withdrawals only
 *   tournament_deduction: number,    // all matches/tournaments joined (sum of fees)
 *   transactions: [
 *     { id, type, amount, status, description, created_at }
 *   ],
 *   recent_matches: [
 *     {
 *       id,                // payment id
 *       tournament_id,     // or match id
 *       type,              // "tournament_join"
 *       amount,            // negative entry fee
 *       status,
 *       description,
 *       joined_at          // created_at of payment
 *     }
 *   ]
 * }
 */
export const getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1) Load user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2) Type groups
    const CREDIT_TYPES = ["credit"];
    const WITHDRAW_TYPES = ["withdrawal"];
    const TOURNAMENT_TYPES = ["tournament_join"]; // must match join controllers exactly

    // 3) Sum credits (wallet top‑ups)
    const totalCredit = await Payment.sum("amount", {
      where: {
        user_id: userId,
        type: { [Op.in]: CREDIT_TYPES },
        status: "success",
      },
    });

    // 4) Sum withdrawals (for debit total)
    const totalWithdrawal = await Payment.sum("amount", {
      where: {
        user_id: userId,
        type: { [Op.in]: WITHDRAW_TYPES },
        status: "success",
      },
    });

    // 5) Sum all match / tournament joins
    const totalTournament = await Payment.sum("amount", {
      where: {
        user_id: userId,
        type: { [Op.in]: TOURNAMENT_TYPES },
        status: "success",
      },
    });

    // 6) Latest transactions (for detail list on right side)
    const tx = await Payment.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      limit: 50,
    });

    const transactions = tx.map((p) => ({
      id: p.id,
      type: p.type,
      amount: p.amount,
      status: p.status,
      description: p.description,
      created_at: p.created_at || p.createdAt,
    }));

    // 7) Recent matches (built from tournament_join payments)
    const matchPayments = await Payment.findAll({
      where: {
        user_id: userId,
        type: { [Op.in]: TOURNAMENT_TYPES },
        status: "success",
      },
      order: [["created_at", "DESC"]],
      limit: 20,
    });

    const recent_matches = matchPayments.map((p) => ({
      id: p.id,
      tournament_id: p.tournament_id || null,   // adapt if you also use headshot_id/cs_id
      type: p.type,
      amount: p.amount,
      status: p.status,
      description: p.description,
      joined_at: p.created_at || p.createdAt,
    }));

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      wallet_balance: user.wallet_balance,
      total_credit: totalCredit || 0,
      total_debit: Math.abs(totalWithdrawal || 0),
      tournament_deduction: Math.abs(totalTournament || 0),
      transactions,
      recent_matches,
    });
  } catch (err) {
    console.error("getUserActivity error", err);
    return res.status(500).json({ message: "Failed to load user activity" });
  }
};