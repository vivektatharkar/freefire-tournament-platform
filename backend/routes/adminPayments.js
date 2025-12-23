// backend/routes/adminPayments.js
import express from "express";
import { auth } from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import { Payment, User } from "../models/index.js";

const router = express.Router();

/* ------------ ADMIN WALLET TOP-UPS TABLE ------------ */

router.get("/wallet-topups", auth, isAdmin, async (req, res) => {
  try {
    const rows = await Payment.findAll({
      where: { type: "credit" }, // wallet top-ups only
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
    }));

    return res.json({ topups });
  } catch (err) {
    console.error("ADMIN WALLET TOPUPS ERROR", err);
    return res.status(500).json({ message: "Failed to load top-ups" });
  }
});

/* ------------ EXPORT CSV FOR PAYMENTS & WITHDRAWALS ------------ */

router.get("/export/payments", auth, isAdmin, async (req, res) => {
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
      "description",
    ];

    const escapeCell = (value) => {
      const s = String(value ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("")) {
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
        (p.description || "").replace(/[]+/g, " "),
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
    // add BOM so Excel parses UTF‑8 + commas properly
    return res.send("﻿" + csv);
  } catch (err) {
    console.error("EXPORT PAYMENTS CSV ERROR", err);
    return res.status(500).json({ message: "Failed to export CSV" });
  }
});

export default router;