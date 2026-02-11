// backend/routes/adminDashboardStats.js
import express from "express";
import { Op, fn, col } from "sequelize";
import { auth } from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import { User, Payment, Participation } from "../models/index.js";

const router = express.Router();
router.use(auth, isAdmin);

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function startOfMonth(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function toNumber(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

async function sumPaymentAmount(where) {
  const row = await Payment.findOne({
    attributes: [[fn("sum", col("amount")), "total"]],
    where,
    raw: true,
  });
  return toNumber(row?.total);
}

async function sumPaymentAbsAmount(where) {
  const row = await Payment.findOne({
    attributes: [[fn("sum", fn("abs", col("amount"))), "total"]],
    where,
    raw: true,
  });
  return toNumber(row?.total);
}

async function countPayments(where) {
  return Payment.count({ where });
}

router.get("/dashboard/stats", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");

    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // USERS
    const totalUsers = await User.count();
    const newUsersToday = await User.count({
      where: { created_at: { [Op.gte]: todayStart } },
    });
    const newUsersWeek = await User.count({
      where: { created_at: { [Op.gte]: weekStart } },
    });
    const newUsersMonth = await User.count({
      where: { created_at: { [Op.gte]: monthStart } },
    });

    const onlineUsers = await User.count({
      where: { last_active_at: { [Op.gte]: fiveMinAgo } },
    });

    // ✅ CREDITS (Wallet top-ups only)
    // Your DB has gateway mostly "manual" / blank, so filter by Razorpay IDs instead.
    // Sequelize supports Op.or and Op.ne for these where clauses [web:1928][web:2444].
    const topupWhereBase = {
      type: "credit",
      status: { [Op.in]: ["success", "approved"] },
      prize_key: { [Op.eq]: null }, // exclude prize distribution
      [Op.or]: [
        { gateway_order_id: { [Op.ne]: null } },
        { gateway_payment_id: { [Op.ne]: null } },
      ],
    };

    const creditsTotal = await sumPaymentAmount(topupWhereBase);
    const creditsToday = await sumPaymentAmount({
      ...topupWhereBase,
      created_at: { [Op.gte]: todayStart },
    });
    const creditsWeek = await sumPaymentAmount({
      ...topupWhereBase,
      created_at: { [Op.gte]: weekStart },
    });
    const creditsMonth = await sumPaymentAmount({
      ...topupWhereBase,
      created_at: { [Op.gte]: monthStart },
    });

    // PRIZE DISTRIBUTION
    const prizeWhereBase = {
      type: "credit",
      status: { [Op.in]: ["success", "approved"] },
      prize_key: { [Op.ne]: null },
    };

    const prizePaidTotal = await sumPaymentAmount(prizeWhereBase);
    const prizePaidToday = await sumPaymentAmount({
      ...prizeWhereBase,
      created_at: { [Op.gte]: todayStart },
    });
    const prizePaidWeek = await sumPaymentAmount({
      ...prizeWhereBase,
      created_at: { [Op.gte]: weekStart },
    });
    const prizePaidMonth = await sumPaymentAmount({
      ...prizeWhereBase,
      created_at: { [Op.gte]: monthStart },
    });

    const prizePaidCountTotal = await countPayments(prizeWhereBase);
    const prizePaidCountToday = await countPayments({
      ...prizeWhereBase,
      created_at: { [Op.gte]: todayStart },
    });
    const prizePaidCountWeek = await countPayments({
      ...prizeWhereBase,
      created_at: { [Op.gte]: weekStart },
    });
    const prizePaidCountMonth = await countPayments({
      ...prizeWhereBase,
      created_at: { [Op.gte]: monthStart },
    });

    // WITHDRAWALS (pending)
    const wdWhereBase = { type: "withdrawal", status: "pending" };

    const withdrawalPendingCount = await Payment.count({ where: wdWhereBase });

    const withdrawalPendingTotal = await sumPaymentAbsAmount(wdWhereBase);
    const withdrawalPendingToday = await sumPaymentAbsAmount({
      ...wdWhereBase,
      created_at: { [Op.gte]: todayStart },
    });
    const withdrawalPendingWeek = await sumPaymentAbsAmount({
      ...wdWhereBase,
      created_at: { [Op.gte]: weekStart },
    });
    const withdrawalPendingMonth = await sumPaymentAbsAmount({
      ...wdWhereBase,
      created_at: { [Op.gte]: monthStart },
    });

    // MATCHES JOINED
    const joinedTotal = await Participation.count();
    const joinedToday = await Participation.count({
      where: { created_at: { [Op.gte]: todayStart } },
    });
    const joinedWeek = await Participation.count({
      where: { created_at: { [Op.gte]: weekStart } },
    });
    const joinedMonth = await Participation.count({
      where: { created_at: { [Op.gte]: monthStart } },
    });

    return res.json({
      total_users: totalUsers,
      online_users: onlineUsers,

      new_users_today: newUsersToday,
      new_users_week: newUsersWeek,
      new_users_month: newUsersMonth,

      credits_total: creditsTotal,
      credits_today: creditsToday,
      credits_week: creditsWeek,
      credits_month: creditsMonth,

      prize_paid_total: prizePaidTotal,
      prize_paid_today: prizePaidToday,
      prize_paid_week: prizePaidWeek,
      prize_paid_month: prizePaidMonth,

      prize_paid_count_total: prizePaidCountTotal,
      prize_paid_count_today: prizePaidCountToday,
      prize_paid_count_week: prizePaidCountWeek,
      prize_paid_count_month: prizePaidCountMonth,

      withdrawal_pending_count: withdrawalPendingCount,
      withdrawal_pending_amount_total: withdrawalPendingTotal,
      withdrawal_pending_amount_today: withdrawalPendingToday,
      withdrawal_pending_amount_week: withdrawalPendingWeek,
      withdrawal_pending_amount_month: withdrawalPendingMonth,

      joined_total: joinedTotal,
      joined_today: joinedToday,
      joined_week: joinedWeek,
      joined_month: joinedMonth,
    });
  } catch (err) {
    console.error("ADMIN DASHBOARD STATS ERROR:", err);
    return res.status(500).json({ message: "Failed to load dashboard stats" });
  }
});

export default router;