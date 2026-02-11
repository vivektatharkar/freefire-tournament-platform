// backend/controllers/notificationController.js
import { Notification } from "../models/index.js";

export const getNotifications = async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit || 50);
    const limit = Math.min(Math.max(limitRaw, 1), 200);

    const rows = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [["created_at", "DESC"]],
      limit,
      raw: true,
    });

    return res.json(rows);
  } catch (err) {
    console.error("getNotifications error", err);
    return res.status(500).json({ message: "Failed to load notifications" });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.update(
      { read_flag: true },
      { where: { user_id: req.user.id, read_flag: false } }
    );
    return res.json({ ok: true, message: "All read" });
  } catch (err) {
    console.error("markAllRead error", err);
    return res.status(500).json({ message: "Failed to update notifications" });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: { user_id: req.user.id, read_flag: false },
    });
    return res.json({ ok: true, count });
  } catch (err) {
    console.error("getUnreadCount error", err);
    return res.status(500).json({ message: "Failed to load unread count" });
  }
};

export const markOneRead = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const [updated] = await Notification.update(
      { read_flag: true },
      { where: { id, user_id: req.user.id } }
    );

    if (!updated) return res.status(404).json({ message: "Notification not found" });
    return res.json({ ok: true, message: "Read" });
  } catch (err) {
    console.error("markOneRead error", err);
    return res.status(500).json({ message: "Failed to update notification" });
  }
};

export const deleteOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const deleted = await Notification.destroy({
      where: { id, user_id: req.user.id },
    });

    if (!deleted) return res.status(404).json({ message: "Notification not found" });
    return res.json({ ok: true, message: "Deleted" });
  } catch (err) {
    console.error("deleteOne notification error", err);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
};