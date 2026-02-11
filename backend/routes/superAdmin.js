// backend/routes/superAdmin.js
import express from "express";
import { Op } from "sequelize";
import sequelize from "../config/db.js";
import { User, Payment, AdminAuditLog } from "../models/index.js";
import { auth } from "../middleware/auth.js";
import isSuperAdmin from "../middleware/isSuperAdmin.js";
import { notifyUser } from "../utils/notify.js";
import { auditLog } from "../utils/audit.js";

const router = express.Router();
router.use(auth, isSuperAdmin);

function isNoSuchTableError(err) {
  const code = err?.original?.code || err?.parent?.code || err?.code;
  const msg = String(err?.original?.sqlMessage || err?.message || "");
  return code === "ER_NO_SUCH_TABLE" || msg.toLowerCase().includes("doesn't exist");
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

// List latest users
router.get("/superadmin/users", async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "email", "role", "created_at", "last_active_at"],
      order: [["id", "DESC"]],
      limit: 500,
    });
    return res.json({ users });
  } catch (err) {
    console.error("GET /superadmin/users error:", err);
    return res.status(500).json({ message: "Failed to load users" });
  }
});

// Promote to admin
router.post("/superadmin/make-admin", async (req, res) => {
  try {
    let { email } = req.body;
    email = String(email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin" || user.role === "superadmin") {
      return res.json({
        message: "Already admin",
        user: { id: user.id, email: user.email, role: user.role },
      });
    }

    await user.update({ role: "admin" });

    // Best-effort audit
    try {
      await auditLog(req, {
        action: "superadmin.make_admin",
        target_user_id: user.id,
        note: `Promoted ${email} to admin`,
      });
    } catch {}

    return res.json({
      message: "Promoted to admin",
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("POST /superadmin/make-admin error:", err);
    return res.status(500).json({ message: "Failed to promote admin" });
  }
});

// Demote admin -> user
router.post("/superadmin/remove-admin", async (req, res) => {
  try {
    let { email } = req.body;
    email = String(email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const me = await User.findByPk(req.user.id, { attributes: ["email"] });
    if (me?.email && String(me.email).trim().toLowerCase() === email) {
      return res.status(400).json({ message: "You cannot remove your own admin" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.update({ role: "user" });

    // Best-effort audit
    try {
      await auditLog(req, {
        action: "superadmin.remove_admin",
        target_user_id: user.id,
        note: `Demoted ${email} to user`,
      });
    } catch {}

    return res.json({
      message: "Admin removed",
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("POST /superadmin/remove-admin error:", err);
    return res.status(500).json({ message: "Failed to remove admin" });
  }
});

/**
 * Manual wallet credit by SuperAdmin
 * POST /api/admin/superadmin/wallet/credit
 * body: { email?: string, user_id?: number, amount: number, note?: string }
 */
router.post("/superadmin/wallet/credit", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const email = (req.body?.email || "").toString().trim().toLowerCase();
    const userIdRaw = req.body?.user_id;
    const amount = Number(req.body?.amount);
    const note = (req.body?.note || "").toString().trim();

    if ((!email && !userIdRaw) || (email && userIdRaw)) {
      await t.rollback();
      return res.status(400).json({ message: "Send either email or user_id" });
    }
    if (!amount || !Number.isFinite(amount) || amount <= 0) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid amount" });
    }

    const user = email
      ? await User.findOne({ where: { email }, transaction: t, lock: t.LOCK.UPDATE })
      : await User.findByPk(Number(userIdRaw), { transaction: t, lock: t.LOCK.UPDATE });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    const before = Number(user.wallet_balance || 0);
    const rounded = round2(amount);
    const after = round2(before + rounded);

    user.wallet_balance = after;
    await user.save({ transaction: t });

    const payment = await Payment.create(
      {
        user_id: user.id,
        amount: rounded,
        type: "credit",
        status: "success",
        gateway: "manual",
        description: note ? `Manual credit: ${note}` : "Manual credit by SuperAdmin",
      },
      { transaction: t }
    );

    // Best-effort audit inside transaction; if table missing, ignore
    try {
      await auditLog(
        req,
        {
          action: "superadmin.credit_wallet",
          target_user_id: user.id,
          target_payment_id: payment.id,
          amount: rounded,
          note: note || null,
        },
        t
      );
    } catch {}

    await t.commit();

    // Notify after commit (best-effort)
    try {
      await notifyUser(
        user.id,
        "wallet_credit",
        `₹${rounded} added to your wallet. ${note ? `Note: ${note}` : ""}`.trim()
      );
    } catch {}

    return res.json({
      ok: true,
      message: "Wallet credited",
      user: { id: user.id, email: user.email, name: user.name },
      wallet_before: before,
      wallet_after: after,
      payment_id: payment.id,
    });
  } catch (err) {
    await t.rollback();
    console.error("POST /superadmin/wallet/credit error:", err);
    return res.status(500).json({ message: "Failed to credit wallet" });
  }
});

/**
 * ✅ NEW: Manual wallet debit (subtract money) by SuperAdmin
 * POST /api/admin/superadmin/wallet/debit
 * body: { email?: string, user_id?: number, amount: number, note?: string }
 */
router.post("/superadmin/wallet/debit", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const email = (req.body?.email || "").toString().trim().toLowerCase();
    const userIdRaw = req.body?.user_id;
    const amount = Number(req.body?.amount);
    const note = (req.body?.note || "").toString().trim();

    if ((!email && !userIdRaw) || (email && userIdRaw)) {
      await t.rollback();
      return res.status(400).json({ message: "Send either email or user_id" });
    }
    if (!amount || !Number.isFinite(amount) || amount <= 0) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid amount" });
    }

    const user = email
      ? await User.findOne({ where: { email }, transaction: t, lock: t.LOCK.UPDATE })
      : await User.findByPk(Number(userIdRaw), { transaction: t, lock: t.LOCK.UPDATE });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    const before = Number(user.wallet_balance || 0);
    const rounded = round2(amount);

    if (before < rounded) {
      await t.rollback();
      return res.status(400).json({
        message: `Insufficient wallet balance. Current: ₹${round2(before)}.`,
      });
    }

    const after = round2(before - rounded);

    user.wallet_balance = after;
    await user.save({ transaction: t });

    const payment = await Payment.create(
      {
        user_id: user.id,
        amount: rounded,
        type: "debit",
        status: "success",
        gateway: "manual",
        description: note ? `Manual debit: ${note}` : "Manual debit by SuperAdmin",
      },
      { transaction: t }
    );

    // Best-effort audit inside transaction; if table missing, ignore
    try {
      await auditLog(
        req,
        {
          action: "superadmin.debit_wallet",
          target_user_id: user.id,
          target_payment_id: payment.id,
          amount: rounded,
          note: note || null,
        },
        t
      );
    } catch {}

    await t.commit();

    // Notify after commit (best-effort)
    try {
      await notifyUser(
        user.id,
        "wallet_debit",
        `₹${rounded} deducted from your wallet. ${note ? `Note: ${note}` : ""}`.trim()
      );
    } catch {}

    return res.json({
      ok: true,
      message: "Wallet debited",
      user: { id: user.id, email: user.email, name: user.name },
      wallet_before: before,
      wallet_after: after,
      payment_id: payment.id,
    });
  } catch (err) {
    await t.rollback();
    console.error("POST /superadmin/wallet/debit error:", err);
    return res.status(500).json({ message: "Failed to debit wallet" });
  }
});

/**
 * Admin activity summary
 * GET /api/admin/superadmin/admin-stats
 */
router.get("/superadmin/admin-stats", async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const admins = await User.findAll({
      where: { role: { [Op.in]: ["admin", "superadmin"] } },
      attributes: ["id", "name", "email", "role", "last_active_at"],
      order: [["id", "DESC"]],
    });

    let rows = [];
    try {
      rows = await AdminAuditLog.findAll({
        where: { created_at: { [Op.gte]: since } },
        attributes: ["actor_user_id", "action"],
        raw: true,
      });
    } catch (e) {
      if (!isNoSuchTableError(e)) throw e;
      rows = [];
    }

    const counts = new Map();
    for (const r of rows) {
      const aid = r.actor_user_id;
      const action = String(r.action || "");
      if (!counts.has(aid)) counts.set(aid, { total: 0 });
      const obj = counts.get(aid);
      obj.total += 1;
      obj[action] = (obj[action] || 0) + 1;
    }

    const out = admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role,
      last_active_at: a.last_active_at,
      actions_7d: counts.get(a.id) || { total: 0 },
    }));

    return res.json({ since, admins: out });
  } catch (err) {
    console.error("GET /superadmin/admin-stats error:", err);
    return res.status(500).json({ message: "Failed to load admin stats" });
  }
});

/**
 * Latest audit logs
 * GET /api/admin/superadmin/audit-logs?limit=200
 */
router.get("/superadmin/audit-logs", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 200), 500);

    let logs = [];
    try {
      logs = await AdminAuditLog.findAll({
        order: [["id", "DESC"]],
        limit,
      });
    } catch (e) {
      if (!isNoSuchTableError(e)) throw e;
      logs = [];
    }

    return res.json({ logs });
  } catch (err) {
    console.error("GET /superadmin/audit-logs error:", err);
    return res.status(500).json({ message: "Failed to load audit logs" });
  }
});

export default router;