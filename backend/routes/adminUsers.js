// backend/routes/adminUsers.js
import express from "express";
import { auth } from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import { getUserActivity } from "../controllers/adminUserController.js";

const router = express.Router();

// GET /api/admin/users/:userId/activity
router.get("/:userId/activity", auth, isAdmin, getUserActivity);

export default router;