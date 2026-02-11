// backend/routes/adminSupport.js
import express from "express";
import sequelize from "../config/db.js";
import { auth } from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

import SupportTicket from "../models/SupportTicket.js";
import SupportMessage from "../models/SupportMessage.js";
import { User } from "../models/index.js";

const router = express.Router();
router.use(auth, isAdmin);

const isDev = (process.env.NODE_ENV || "development") !== "production";
const norm = (v) => (v ?? "").toString().trim();

const safeLower = (v) => norm(v).toLowerCase();
const safeBool = (v) => ["1", "true", "yes", "y"].includes(safeLower(v));

/**
 * GET /api/admin/support/tickets
 * Query:
 *  - status=open|in_progress|closed|all (default: all)
 *  - q=search subject or user_id
 *  - limit=500
 */
router.get("/support/tickets", async (req, res) => {
  try {
    const status = safeLower(req.query.status);
    const q = norm(req.query.q);
    const limit = Math.min(Number(req.query.limit) || 500, 1000);

    const where = {};

    // status filter
    if (status && status !== "all") {
      if (["open", "in_progress", "closed"].includes(status)) {
        where.status = status;
      }
    }

    // quick search
    if (q) {
      // if numeric -> try user_id
      const n = Number(q);
      if (Number.isFinite(n)) {
        where.user_id = n;
      } else {
        // subject contains (works in MySQL/MariaDB; for strict dialects you may replace with Op.like)
        where.subject = sequelize.where(
          sequelize.fn("LOWER", sequelize.col("subject")),
          "LIKE",
          `%${q.toLowerCase()}%`
        );
      }
    }

    const tickets = await SupportTicket.findAll({
      where,
      order: [
        ["status", "ASC"],
        ["last_message_at", "DESC"],
        ["updated_at", "DESC"],
      ],
      limit,
    });

    // attach user details (optional)
    const userIds = [...new Set(tickets.map((t) => t.user_id).filter(Boolean))];
    const usersIndex = {};

    if (userIds.length && User) {
      const attrs = ["id"];

      // keep your “optional fields” logic
      if (User?.rawAttributes?.name) attrs.push("name");
      if (User?.rawAttributes?.game_id) attrs.push("game_id");
      if (User?.rawAttributes?.phone) attrs.push("phone");
      if (User?.rawAttributes?.email) attrs.push("email");

      const users = await User.findAll({
        where: { id: userIds },
        attributes: attrs,
        raw: true,
      });

      for (const u of users) usersIndex[u.id] = u;
    }

    const rows = tickets.map((t) => ({
      ...t.toJSON(),
      user: usersIndex[t.user_id] || null,
    }));

    return res.json({ tickets: rows });
  } catch (err) {
    if (isDev) console.error(err);
    return res.status(500).json({ message: "Failed to load tickets" });
  }
});

/**
 * GET /api/admin/support/tickets/:id
 */
router.get("/support/tickets/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid ticket id" });

    const ticket = await SupportTicket.findByPk(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const messages = await SupportMessage.findAll({
      where: { ticket_id: id },
      order: [["created_at", "ASC"]],
    });

    return res.json({ ticket, messages });
  } catch (err) {
    if (isDev) console.error(err);
    return res.status(500).json({ message: "Failed to load ticket" });
  }
});

/**
 * POST /api/admin/support/tickets/:id/message
 */
router.post("/support/tickets/:id/message", async (req, res) => {
  const trx = await sequelize.transaction();
  try {
    const adminId = req?.user?.id;
    const id = Number(req.params.id);
    const message = norm(req.body.message);

    if (!Number.isFinite(id)) {
      await trx.rollback();
      return res.status(400).json({ message: "Invalid ticket id" });
    }
    if (!message || message.length < 2) {
      await trx.rollback();
      return res.status(400).json({ message: "Message required" });
    }

    const ticket = await SupportTicket.findByPk(id);
    if (!ticket) {
      await trx.rollback();
      return res.status(404).json({ message: "Ticket not found" });
    }

    await SupportMessage.create(
      {
        ticket_id: id,
        sender_role: "admin",
        sender_user_id: adminId || null,
        message: message.slice(0, 8000),
      },
      { transaction: trx }
    );

    const nextStatus = ticket.status === "open" ? "in_progress" : ticket.status;

    await ticket.update(
      { status: nextStatus, last_message_at: new Date() },
      { transaction: trx }
    );

    await trx.commit();
    return res.json({ message: "Reply sent" });
  } catch (err) {
    if (trx) await trx.rollback();
    if (isDev) console.error(err);
    return res.status(500).json({ message: "Failed to send reply" });
  }
});

/**
 * PUT /api/admin/support/tickets/:id/status
 */
router.put("/support/tickets/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = safeLower(req.body.status);

    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid ticket id" });
    if (!["open", "in_progress", "closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const ticket = await SupportTicket.findByPk(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    await ticket.update({ status });
    return res.json({ message: "Status updated" });
  } catch (err) {
    if (isDev) console.error(err);
    return res.status(500).json({ message: "Failed to update status" });
  }
});

export default router;