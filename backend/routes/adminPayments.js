// backend/routes/adminPayments.js
import express from "express";
import { Op } from "sequelize";
import { auth } from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import sequelize from "../config/db.js";
import { Payment, User } from "../models/index.js";
import { notifyUser } from "../utils/notify.js";

const router = express.Router();
const requireAdmin = [auth, isAdmin];

const ADMIN_USER_ID = Number(process.env.ADMIN_USER_ID || 1);

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normLower(v) {
  return (v ?? "").toString().trim().toLowerCase();
}

function buildPrizeKey({ match_type, match_id, rank, user_id }) {
  return `PRIZE:${match_type}:${match_id}:R${rank}:U${user_id}`;
}

/* ------------ ADMIN WALLET TOP-UPS TABLE ------------ */
/**
 * GET /api/admin/wallet-topups
 * Show wallet top-ups (including old data).
 * Top-up definition here:
 * - type = "credit"
 * - prize_key IS NULL   (exclude prizes)
 * - status in success/approved (you can include pending if you want)
 */
router.get("/wallet-topups", requireAdmin, async (req, res) => {
  try {
    const rows = await Payment.findAll({
      where: {
        type: "credit",
        prize_key: { [Op.eq]: null }, // exclude prize distribution
        status: { [Op.in]: ["success", "approved"] }, // include only completed topups
        // If you also want to see pending, use:
        // status: { [Op.in]: ["success", "approved", "pending"] },
      },
      order: [["created_at", "DESC"]],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    const topups = rows.map((p) => ({
      id: p.id,
      date: p.created_at || p.createdAt,
      user_id: p.user_id,
      user_name: p.user?.name || "",
      email: p.user?.email || "",
      amount: p.amount,
      status: p.status,
      payment_id: p.gateway_payment_id || "",
      order_id: p.gateway_order_id || "",
      description: p.description || "",
      gateway: p.gateway || "",
    }));

    return res.json({ topups });
  } catch (err) {
    console.error("ADMIN WALLET TOPUPS ERROR", err);
    return res.status(500).json({ message: "Failed to load top-ups" });
  }
});

/* ------------ ADMIN: PRIZE CREDIT (LEADERBOARD) ------------ */
router.post("/prizes/credit", requireAdmin, async (req, res) => {
  const match_type = normLower(req.body.match_type);
  const match_id = toNum(req.body.match_id);
  const rank = toNum(req.body.rank);

  const team_id = req.body.team_id == null ? null : toNum(req.body.team_id);
  const group_no = req.body.group_no == null ? null : toNum(req.body.group_no);

  const payouts = Array.isArray(req.body.payouts) ? req.body.payouts : [];
  const note = (req.body.note ?? "").toString().trim();

  const ALLOWED = new Set(["tournament", "b2b", "cs", "headshot"]);
  if (!ALLOWED.has(match_type) || match_id == null) {
    return res.status(400).json({ message: "Invalid match_type or match_id" });
  }

  if (![1, 2, 3].includes(Number(rank))) {
    return res.status(400).json({ message: "Rank must be 1, 2, or 3" });
  }

  if (!payouts.length) {
    return res.status(400).json({ message: "payouts is required" });
  }

  const cleaned = [];
  const seen = new Set();

  for (const p of payouts) {
    const uid = toNum(p?.user_id);
    const amt = toNum(p?.amount);

    if (!uid || uid <= 0) {
      return res.status(400).json({ message: "Invalid user_id in payouts" });
    }
    if (!amt || amt <= 0) {
      return res.status(400).json({ message: "Invalid amount in payouts" });
    }
    if (seen.has(uid)) {
      return res.status(400).json({ message: "Duplicate user_id in payouts" });
    }
    seen.add(uid);

    const rounded = Math.round(amt * 100) / 100;
    cleaned.push({ user_id: uid, amount: rounded });
  }

  const totalAmount =
    Math.round(cleaned.reduce((a, x) => a + Number(x.amount || 0), 0) * 100) /
    100;

  try {
    const result = await sequelize.transaction(async (t) => {
      const done = [];
      const skipped = [];

      for (const item of cleaned) {
        const prizeKey = buildPrizeKey({
          match_type,
          match_id,
          rank,
          user_id: item.user_id,
        });

        const user = await User.findByPk(item.user_id, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!user) {
          skipped.push({ user_id: item.user_id, reason: "User not found" });
          continue;
        }

        const existing = await Payment.findOne({
          where: { prize_key: prizeKey },
          transaction: t,
        });

        if (existing) {
          skipped.push({ user_id: item.user_id, reason: "Already paid" });
          continue;
        }

        const before = Number(user.wallet_balance || 0);
        const after = before + Number(item.amount || 0);

        user.wallet_balance = after;
        await user.save({ transaction: t });

        const desc =
          note || `Prize credited for rank ${rank} (${match_type} #${match_id})`;

        await Payment.create(
          {
            user_id: user.id,
            tournament_id: match_type === "tournament" ? match_id : null,
            amount: item.amount,
            type: "credit",
            status: "success",
            gateway: "manual",
            prize_key: prizeKey,
            description: desc,
          },
          { transaction: t }
        );

        done.push({
          user_id: user.id,
          credited: item.amount,
          wallet_before: before,
          wallet_after: after,
          prize_key: prizeKey,
        });
      }

      return { done, skipped };
    });

    try {
      for (const d of result.done) {
        await notifyUser(
          d.user_id,
          "wallet_credit",
          `Prize credited: ₹${d.credited} (Rank ${rank}, ${match_type} #${match_id}).`
        );
      }

      await notifyUser(
        ADMIN_USER_ID,
        "wallet_credit",
        `Prize payout done for ${match_type} #${match_id}, rank ${rank}. Total: ₹${totalAmount}.`
      );
    } catch (e) {
      console.warn("Prize notify warning:", e?.message || e);
    }

    return res.json({
      ok: true,
      match_type,
      match_id,
      rank,
      team_id,
      group_no,
      total_attempted: totalAmount,
      credited_count: result.done.length,
      skipped_count: result.skipped.length,
      credited: result.done,
      skipped: result.skipped,
      note,
    });
  } catch (err) {
    const name = String(err?.name || "");
    const msg = String(err?.message || "");

    if (name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({ message: "Prize already paid (duplicate request)" });
    }
    if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("prize_key")) {
      return res
        .status(409)
        .json({ message: "Prize already paid (duplicate request)" });
    }

    console.error("ADMIN PRIZE CREDIT ERROR", err);
    return res.status(500).json({ message: "Failed to credit prize" });
  }
});

/* ------------ EXPORT CSV FOR PAYMENTS & WITHDRAWALS ------------ */
// GET /api/admin/export/payments
router.get("/export/payments", requireAdmin, async (req, res) => {
  try {
    const rows = await Payment.findAll({
      order: [["created_at", "DESC"]],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    const header = [
      "id",
      "date",
      "user_id",
      "user_name",
      "email",
      "type",
      "amount",
      "status",
      "upi_id",
      "payment_id",
      "order_id",
      "prize_key",
      "description",
      "gateway",
    ];

    const escapeCell = (value) => {
      const s = String(value ?? "");
      // Wrap in quotes if it contains comma, quote, or newline
      if (s.includes(",") || s.includes('"') || s.includes("") || s.includes("")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = rows.map((p) =>
      [
        p.id,
        (p.created_at || p.createdAt)?.toISOString?.() || "",
        p.user_id,
        p.user?.name || "",
        p.user?.email || "",
        p.type,
        p.amount,
        p.status,
        p.upi_id || "",
        p.gateway_payment_id || "",
        p.gateway_order_id || "",
        p.prize_key || "",
        (p.description || "").replace(/s+/g, " ").trim(),
        p.gateway || "",
      ]
        .map(escapeCell)
        .join(",")
    );

    const csv = [header.join(","), ...lines].join("");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payments_${Date.now()}.csv"`
    );

    // BOM for Excel UTF-8
    return res.send("﻿" + csv);
  } catch (err) {
    console.error("EXPORT PAYMENTS CSV ERROR", err);
    return res.status(500).json({ message: "Failed to export CSV" });
  }
});

export default router;