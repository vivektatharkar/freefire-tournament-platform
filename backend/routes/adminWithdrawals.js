// backend/routes/adminWithdrawals.js
import express from "express";
import sequelize from "../config/db.js";
import { User, Payment } from "../models/index.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

/* ========= ADMIN MIDDLEWARE ========= */
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
}

/* ================= LIST WITHDRAW REQUESTS ================= */
// GET /api/admin/withdrawals
router.get("/withdrawals", auth, adminOnly, async (req, res) => {
  try {
    const rows = await Payment.findAll({
      where: { type: "withdrawal" },
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "phone", "wallet_balance"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load withdrawals" });
  }
});

/* ================= APPROVE ================= */
// POST /api/admin/withdrawals/:id/approve
router.post("/withdrawals/:id/approve", auth, adminOnly, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const payment = await Payment.findByPk(req.params.id, { transaction: t });

    if (!payment || payment.status !== "pending") {
      await t.rollback();
      return res.status(400).json({ message: "Invalid request" });
    }

    payment.status = "success";
    await payment.save({ transaction: t });

    await t.commit();
    res.json({ message: "Withdrawal approved" });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: "Approval failed" });
  }
});

/* ================= REJECT ================= */
// POST /api/admin/withdrawals/:id/reject
router.post("/withdrawals/:id/reject", auth, adminOnly, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const payment = await Payment.findByPk(req.params.id, { transaction: t });

    if (!payment || payment.status !== "pending") {
      await t.rollback();
      return res.status(400).json({ message: "Invalid request" });
    }

    const user = await User.findByPk(payment.user_id, { transaction: t });

    // 💰 Refund wallet
    user.wallet_balance =
      Number(user.wallet_balance) + Math.abs(Number(payment.amount));
    await user.save({ transaction: t });

    payment.status = "rejected";
    await payment.save({ transaction: t });

    await t.commit();
    res.json({ message: "Withdrawal rejected & refunded" });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: "Reject failed" });
  }
});

export default router;