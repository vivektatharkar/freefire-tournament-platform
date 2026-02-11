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
        "type",
        "status",
        "description",
        "created_at",
      ],
    });

    res.json({
      history: rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        type: r.type,
        status: r.status,
        description: r.description,
        created_at: r.created_at || r.createdAt || null,
      })),
    });
  } catch (err) {
    console.error("WALLET HISTORY ERROR:", err);
    res.status(500).json({ message: "Failed to load wallet history" });
  }
};