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
  cancelTopup,              // ✅ add this
} from "../controllers/paymentController.js";

import { Payment } from "../models/index.js";

const router = express.Router();

/* WALLET TOP-UP (RAZORPAY) */

// Create Razorpay order
router.post("/create-order", auth, createOrder);

// Verify Razorpay payment
router.post("/verify", auth, verifyPayment);

// User cancelled / failed top-up -> mark as rejected
router.post("/cancel-topup", auth, cancelTopup);  // ✅ new route

/* WALLET HISTORY (USER) */

router.get("/wallet-history", auth, async (req, res) => {
  try {
    const history = await Payment.findAll({
      where: { user_id: req.user.id },
      order: [["created_at", "DESC"]],
    });

    res.json({ history });
  } catch (err) {
    console.error("wallet history error:", err);
    res.status(500).json({ message: "Failed to load wallet history" });
  }
});

/* WITHDRAWAL (USER) */

router.post("/withdraw", auth, requestWithdrawal);

/* ADMIN – WITHDRAWAL MANAGEMENT */

router.get("/withdrawals", auth, isAdmin, getWithdrawals);

router.post(
  "/withdrawals/:id/approve",
  auth,
  isAdmin,
  approveWithdrawal
);

router.post(
  "/withdrawals/:id/reject",
  auth,
  isAdmin,
  rejectWithdrawal
);

export default router;