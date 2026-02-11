// backend/routes/support.js
import express from "express";
import sequelize from "../config/db.js";
import { auth } from "../middleware/auth.js";

import SupportTicket from "../models/SupportTicket.js";
import SupportMessage from "../models/SupportMessage.js";

const router = express.Router();
router.use(auth);

const isDev = (process.env.NODE_ENV || "development") !== "production";
const norm = (v) => (v ?? "").toString().trim();

/**
 * POST /api/support/tickets
 * Creates a ticket + first message
 */
router.post("/tickets", async (req, res) => {
  const trx = await sequelize.transaction();
  try {
    const userId = req?.user?.id;
    if (!userId) {
      await trx.rollback();
      return res.status(401).json({ message: "Unauthorized" });
    }

    const subject = norm(req.body.subject);
    const message = norm(req.body.message);
    const source = norm(req.body.source) || "app";

    if (!subject || subject.length < 3) {
      await trx.rollback();
      return res.status(400).json({ message: "Subject required" });
    }
    if (!message || message.length < 10) {
      await trx.rollback();
      return res.status(400).json({ message: "Message too short" });
    }

    const ticket = await SupportTicket.create(
      {
        user_id: userId,
        subject: subject.slice(0, 120),
        status: "open",
        priority: "normal",
        source: source.slice(0, 40),
        last_message_at: new Date(),
      },
      { transaction: trx }
    );

    await SupportMessage.create(
      {
        ticket_id: ticket.id,
        sender_role: "user",
        sender_user_id: userId,
        message: message.slice(0, 8000),
      },
      { transaction: trx }
    );

    await trx.commit();
    return res.status(201).json({ message: "Ticket created", ticket_id: ticket.id });
  } catch (err) {
    if (trx) await trx.rollback();
    if (isDev) console.error(err);
    return res.status(500).json({ message: "Failed to create ticket" });
  }
});

/**
 * GET /api/support/tickets/my
 */
router.get("/tickets/my", async (req, res) => {
  try {
    const userId = req?.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const tickets = await SupportTicket.findAll({
      where: { user_id: userId },
      order: [
        ["status", "ASC"],
        ["last_message_at", "DESC"],
        ["updated_at", "DESC"],
      ],
      limit: 200,
    });

    return res.json({ tickets });
  } catch (err) {
    if (isDev) console.error(err);
    return res.status(500).json({ message: "Failed to load tickets" });
  }
});

/**
 * GET /api/support/tickets/:id
 */
router.get("/tickets/:id", async (req, res) => {
  try {
    const userId = req?.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid ticket id" });

    const ticket = await SupportTicket.findOne({ where: { id, user_id: userId } });
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
 * POST /api/support/tickets/:id/message
 */
router.post("/tickets/:id/message", async (req, res) => {
  const trx = await sequelize.transaction();
  try {
    const userId = req?.user?.id;
    if (!userId) {
      await trx.rollback();
      return res.status(401).json({ message: "Unauthorized" });
    }

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

    const ticket = await SupportTicket.findOne({ where: { id, user_id: userId } });
    if (!ticket) {
      await trx.rollback();
      return res.status(404).json({ message: "Ticket not found" });
    }
    if (ticket.status === "closed") {
      await trx.rollback();
      return res.status(400).json({ message: "Ticket is closed" });
    }

    await SupportMessage.create(
      {
        ticket_id: id,
        sender_role: "user",
        sender_user_id: userId,
        message: message.slice(0, 8000),
      },
      { transaction: trx }
    );

    await ticket.update({ last_message_at: new Date() }, { transaction: trx });

    await trx.commit();
    return res.json({ message: "Message sent" });
  } catch (err) {
    if (trx) await trx.rollback();
    if (isDev) console.error(err);
    return res.status(500).json({ message: "Failed to send message" });
  }
});

export default router;