// backend/controllers/paymentController.js
import Razorpay from "razorpay";
import crypto from "crypto";
import sequelize from "../config/db.js";
import { Payment, User } from "../models/index.js";
import { notifyUser } from "../utils/notify.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const ADMIN_USER_ID = Number(process.env.ADMIN_USER_ID || 1);

/* ------------ WALLET TOP-UP ------------- */

export const createOrder = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `wallet_${req.user.id}_${Date.now()}`,
    });

    // create pending wallet payment (store gateway + order id)
    await Payment.create({
      user_id: req.user.id,
      amount,
      type: "credit",
      status: "pending",
      gateway: "razorpay",
      gateway_order_id: order.id,
      description: "Wallet top-up",
    });

    return res.json({
      order,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("CREATE ORDER ERROR", err);
    return res.status(500).json({ message: "Create order failed" });
  }
};

export const verifyPayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      await t.rollback();
      return res.status(400).json({
        ok: false,
        message: "Missing Razorpay fields",
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    // lock the payment row to avoid double process if verify called twice
    const payment = await Payment.findOne({
      where: { gateway_order_id: razorpay_order_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!payment) {
      await t.rollback();
      return res
        .status(404)
        .json({ ok: false, message: "Payment record not found" });
    }

    // If already success, just return current balance
    if (payment.status === "success") {
      const user = await User.findByPk(payment.user_id, { transaction: t });
      await t.commit();
      return res.json({
        ok: true,
        message: "Payment already processed",
        newBalance: user ? user.wallet_balance : undefined,
      });
    }

    // save gateway fields even if rejected
    payment.gateway = payment.gateway || "razorpay";
    payment.gateway_payment_id = razorpay_payment_id || null;
    payment.gateway_signature = razorpay_signature || null;

    if (expected !== razorpay_signature) {
      payment.status = "rejected";
      await payment.save({ transaction: t });
      await t.commit();

      return res
        .status(400)
        .json({ ok: false, message: "Invalid signature, payment rejected" });
    }

    // valid -> mark success and credit wallet (in same transaction)
    payment.status = "success";
    await payment.save({ transaction: t });

    const user = await User.findByPk(payment.user_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    user.wallet_balance =
      Number(user.wallet_balance || 0) + Number(payment.amount || 0);
    await user.save({ transaction: t });

    await t.commit();

    // notify after commit
    try {
      await notifyUser(
        user.id,
        "wallet_credit",
        `₹${payment.amount} has been added to your wallet.`
      );
    } catch (e) {
      console.warn("notifyUser warning:", e?.message || e);
    }

    return res.json({
      ok: true,
      message: "Wallet updated",
      newBalance: user.wallet_balance,
    });
  } catch (err) {
    await t.rollback();
    console.error("VERIFY ERROR", err);
    return res
      .status(500)
      .json({ ok: false, message: "Verification failed" });
  }
};

/**
 * Mark a created order as cancelled / rejected when user closes Razorpay.
 */
export const cancelTopup = async (req, res) => {
  try {
    const { orderId } = req.body; // razorpay_order_id
    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    const payment = await Payment.findOne({
      where: {
        gateway_order_id: orderId,
        user_id: req.user.id,
      },
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    if (payment.status !== "pending") {
      return res.json({ message: "Payment already processed", ok: true });
    }

    payment.status = "rejected";
    await payment.save();

    return res.json({ message: "Top-up cancelled", ok: true });
  } catch (err) {
    console.error("CANCEL TOPUP ERROR", err);
    return res.status(500).json({ message: "Cancel failed" });
  }
};

/* ------------ WITHDRAWAL (USER) ------------- */

export const requestWithdrawal = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { amount, upi_id } = req.body;
    const withdrawAmount = Number(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid withdrawal amount" });
    }
    if (!upi_id) {
      await t.rollback();
      return res.status(400).json({ message: "UPI ID required" });
    }

    const user = await User.findByPk(req.user.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    if (Number(user.wallet_balance) < withdrawAmount) {
      await t.rollback();
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    user.wallet_balance = Number(user.wallet_balance) - withdrawAmount;
    await user.save({ transaction: t });

    const payment = await Payment.create(
      {
        user_id: user.id,
        amount: -withdrawAmount,
        type: "withdrawal",
        status: "pending",
        upi_id,
        description: "Withdrawal request (UPI)",
      },
      { transaction: t }
    );

    await t.commit();

    await notifyUser(
      user.id,
      "withdrawal",
      `Withdrawal request of ₹${withdrawAmount} submitted. Waiting for admin approval.`
    );
    await notifyUser(
      ADMIN_USER_ID,
      "withdrawal",
      `New withdrawal request from ${user.name || user.email} (ID ${
        user.id
      }) of ₹${withdrawAmount} to ${upi_id}.`
    );

    return res.json({
      message: "Withdrawal request submitted. Waiting for admin approval.",
      wallet_balance: user.wallet_balance,
      request_id: payment.id,
    });
  } catch (err) {
    await t.rollback();
    console.error("WITHDRAW ERROR", err);
    return res.status(500).json({ message: "Withdrawal failed" });
  }
};

/* ------------ WITHDRAWALS LIST (ADMIN) ------------- */

export const getWithdrawals = async (req, res) => {
  try {
    const rows = await Payment.findAll({
      where: { type: "withdrawal" },
      order: [["created_at", "DESC"]],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone"],
        },
      ],
    });

    const withdrawals = rows.map((w) => ({
      id: w.id,
      user_id: w.user_id,
      user_name: w.user?.name || "",
      email: w.user?.email || "",
      phone: w.user?.phone || "",
      amount: w.amount,
      upi_id: w.upi_id,
      status: w.status,
      type: w.type,
      description: w.description,
      created_at: w.created_at || w.createdAt,
    }));

    return res.json({ withdrawals });
  } catch (err) {
    console.error("GET WITHDRAWALS ERROR", err);
    return res.status(500).json({ message: "Failed to load withdrawals" });
  }
};

/* ------------ APPROVE / REJECT (ADMIN) ------------- */

export const approveWithdrawal = async (req, res) => {
  try {
    const w = await Payment.findByPk(req.params.id);
    if (!w || w.status !== "pending") {
      return res.status(400).json({ message: "Invalid withdrawal request" });
    }

    w.status = "success";
    w.transaction_id = `WD-${Date.now()}`;
    await w.save();

    await notifyUser(
      w.user_id,
      "withdrawal",
      `Your withdrawal of ₹${Math.abs(
        w.amount
      )} has been approved. Amount sent manually.`
    );
    await notifyUser(
      ADMIN_USER_ID,
      "withdrawal",
      `Withdrawal of ₹${Math.abs(w.amount)} for user ID ${w.user_id} APPROVED.`
    );

    return res.json({ message: "Withdrawal approved" });
  } catch (err) {
    console.error("APPROVE WITHDRAWAL ERROR", err);
    return res.status(500).json({ message: "Approve failed" });
  }
};

export const rejectWithdrawal = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const w = await Payment.findByPk(req.params.id, { transaction: t });
    if (!w || w.status !== "pending") {
      await t.rollback();
      return res.status(400).json({ message: "Invalid request" });
    }

    const user = await User.findByPk(w.user_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    user.wallet_balance = Number(user.wallet_balance) + Math.abs(Number(w.amount));
    await user.save({ transaction: t });

    w.status = "rejected";
    await w.save({ transaction: t });

    await t.commit();

    await notifyUser(
      w.user_id,
      "withdrawal",
      `Your withdrawal of ₹${Math.abs(w.amount)} was rejected. Amount refunded.`
    );
    await notifyUser(
      ADMIN_USER_ID,
      "withdrawal",
      `Withdrawal of ₹${Math.abs(w.amount)} for user ID ${w.user_id} REJECTED and refunded.`
    );

    return res.json({ message: "Withdrawal rejected & refunded" });
  } catch (err) {
    await t.rollback();
    console.error("REJECT ERROR", err);
    return res.status(500).json({ message: "Reject failed" });
  }
};

/* ------------ OPTIONAL WEBHOOK ------------- */
export const handleWebhook = async (_req, res) => {
  return res.json({ ok: true });
};