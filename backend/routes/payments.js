// backend/routes/payments.js
import express from "express";
import { auth } from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

import {
  createOrder,
  verifyPayment,
  requestWithdrawal,
  getWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  cancelTopup,
} from "../controllers/paymentController.js";

import { Payment } from "../models/index.js";

const router = express.Router();

/* WALLET TOP-UP (RAZORPAY) */

// Create Razorpay order
router.post("/create-order", auth, createOrder);

// Verify Razorpay payment
router.post("/verify", auth, verifyPayment);

// User cancelled / failed top-up
router.post("/cancel-topup", auth, cancelTopup);

/* WALLET HISTORY (USER)
   IMPORTANT:
   - Keep Payment.amount stored as positive
   - Return signed_amount for UI: credit = +, debit/withdrawal = -
   - This prevents the “admin gave prize but wallet got cut” confusion [web:2367]
*/

function toNumber(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function getSignedAmount(payment) {
  const amt = toNumber(payment.amount);

  // Normalize possible types (some projects use 'withdrawal' or 'debit')
  const type = (payment.type || "").toLowerCase();

  if (type === "credit") return +amt;
  if (type === "debit" || type === "withdrawal") return -amt;

  // Unknown types won't affect signed calc, but still appear in history
  return 0;
}

router.get("/wallet-history", auth, async (req, res) => {
  try {
    const historyRows = await Payment.findAll({
      where: { user_id: req.user.id },
      // Robust order for both naming styles:
      // if your model maps createdAt -> created_at, Sequelize still accepts "createdAt" [web:1991]
      order: [
        ["created_at", "DESC"],
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
    });

    const history = historyRows.map((p) => {
      const amount = toNumber(p.amount);
      const signed_amount = getSignedAmount(p);

      return {
        id: p.id,
        user_id: p.user_id,
        type: p.type,
        amount, // always positive number in response
        signed_amount, // use this in UI for +/-
        description: p.description || "",
        status: p.status || null,
        prize_key: p.prize_key || null,
        created_at: p.created_at || null,
        updated_at: p.updated_at || null,
        createdAt: p.createdAt || null,
        updatedAt: p.updatedAt || null,
      };
    });

    return res.json({ history });
  } catch (err) {
    console.error("wallet history error:", err);
    return res.status(500).json({ message: "Failed to load wallet history" });
  }
});

/* WITHDRAWAL (USER) */

router.post("/withdraw", auth, requestWithdrawal);

/* ADMIN – WITHDRAWAL MANAGEMENT */

router.get("/withdrawals", auth, isAdmin, getWithdrawals);

router.post("/withdrawals/:id/approve", auth, isAdmin, approveWithdrawal);

router.post("/withdrawals/:id/reject", auth, isAdmin, rejectWithdrawal);

export default router;