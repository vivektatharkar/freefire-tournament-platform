// backend/routes/notifications.js
import express from "express";
import { auth } from "../middleware/auth.js";
import {
  getNotifications,
  markAllRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", auth, getNotifications);
router.post("/mark-all-read", auth, markAllRead);

export default router;