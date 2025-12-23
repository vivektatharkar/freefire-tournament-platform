// backend/controllers/notificationController.js
import { Notification } from "../models/index.js";

export const getNotifications = async (req, res) => {
  try {
    const rows = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [["created_at", "DESC"]],
    });
    res.json(rows);
  } catch (err) {
    console.error("getNotifications error", err);
    res.status(500).json({ message: "Failed to load notifications" });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.update(
      { read_flag: true },
      { where: { user_id: req.user.id } }
    );
    res.json({ message: "All read" });
  } catch (err) {
    console.error("markAllRead error", err);
    res.status(500).json({ message: "Failed to update notifications" });
  }
};