// backend/controllers/walletController.js
import { Payment } from "../models/index.js";

export const getWalletHistory = async (req, res) => {
  try {
    const rows = await Payment.findAll({
      where: { user_id: req.user.id },
      order: [["created_at", "DESC"]],
      attributes: [
        "id",
        "amount",
        "type",        // "credit" | "debit"
        "status",      // "pending" | "success" | "failed"
        "description",
        "created_at",
      ],
    });

    // Shape expected by frontend
    res.json({
      history: rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        type: r.type,
        status: r.status,        // will be "pending" / "success" / "failed"
        description: r.description,
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    console.error("WALLET HISTORY ERROR:", err);
    res.status(500).json({ message: "Failed to load wallet history" });
  }
};