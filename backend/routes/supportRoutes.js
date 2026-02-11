// backend/routes/supportRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

import models from "../models/index.js";
const { SupportTicket, SupportMessage } = models;

const router = express.Router();

// Create ticket (from HelpCenter modal)
router.post("/tickets", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { subject, message, source } = req.body || {};

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!subject || !subject.trim())
      return res.status(400).json({ message: "Subject is required" });
    if (!message || !message.trim())
      return res.status(400).json({ message: "Message is required" });

    const ticket = await SupportTicket.create({
      user_id: userId,
      subject: subject.trim(),
      status: "open",
      priority: "normal",
      source: source || "helpcenter",
      last_message_at: new Date(),
    });

    await SupportMessage.create({
      ticket_id: ticket.id,
      sender_role: "user",
      sender_user_id: userId,
      message: message.trim(),
    });

    return res.status(201).json({
      message: "Ticket created",
      ticket_id: ticket.id,
    });
  } catch (e) {
    console.error("Create ticket error:", e);
    return res.status(500).json({ message: "Failed to create ticket" });
  }
});

// List my tickets
router.get("/tickets/my", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const tickets = await SupportTicket.findAll({
      where: { user_id: userId },
      order: [["updated_at", "DESC"]],
    });

    return res.json({ tickets });
  } catch (e) {
    console.error("My tickets error:", e);
    return res.status(500).json({ message: "Failed to load tickets" });
  }
});

// Get a ticket thread
router.get("/tickets/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const ticketId = Number(req.params.id);

    const ticket = await SupportTicket.findOne({
      where: { id: ticketId, user_id: userId },
    });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const messages = await SupportMessage.findAll({
      where: { ticket_id: ticketId },
      order: [["created_at", "ASC"]],
    });

    return res.json({ ticket, messages });
  } catch (e) {
    console.error("Ticket thread error:", e);
    return res.status(500).json({ message: "Failed to load ticket" });
  }
});

// Add message to ticket
router.post("/tickets/:id/message", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const ticketId = Number(req.params.id);
    const { message } = req.body || {};

    if (!message || !message.trim())
      return res.status(400).json({ message: "Message is required" });

    const ticket = await SupportTicket.findOne({
      where: { id: ticketId, user_id: userId },
    });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    await SupportMessage.create({
      ticket_id: ticketId,
      sender_role: "user",
      sender_user_id: userId,
      message: message.trim(),
    });

    await ticket.update({ last_message_at: new Date() });

    return res.json({ message: "Sent" });
  } catch (e) {
    console.error("Send ticket message error:", e);
    return res.status(500).json({ message: "Failed to send message" });
  }
});

export default router;