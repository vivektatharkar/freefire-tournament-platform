// backend/routes/adminHeadshotRoutes.js
import express from "express";
import sequelize from "../config/db.js";
import { auth } from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

import Headshot from "../models/Headshot.js";
import { User, Participation } from "../models/index.js";

const router = express.Router();
const requireAdmin = [auth, isAdmin];

/* Disable caching for these admin APIs (helps avoid 304 while developing) */
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  next();
});

/* ------------ helpers ------------- */
const normalizeStatus = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "upcoming" || s === "live" || s === "completed" || s === "locked")
    return s;
  return "upcoming";
};

const normalizeMode = (mode) => {
  const m = String(mode || "").trim().toLowerCase();
  if (!m) return null;
  // if you only want these 3 modes, enforce it:
  if (m === "solo" || m === "duo" || m === "squad") return m;
  return m; // keep any text like "CS" if you want
};

/* ============ ADMIN HEADSHOT ROUTES ============ */

/**
 * GET all headshot tournaments
 * GET /api/admin/headshot
 */
router.get("/headshot", requireAdmin, async (req, res) => {
  try {
    const matches = await Headshot.findAll({ order: [["id", "DESC"]] });

    const ids = matches.map((m) => m.id);
    let countsByMatch = {};

    if (ids.length > 0) {
      const [rows] = await sequelize.query(
        `SELECT headshot_id, COUNT(*) AS joined_count
         FROM participations
         WHERE headshot_id IN (${ids.map(() => "?").join(",")})
         GROUP BY headshot_id`,
        { replacements: ids }
      );

      rows.forEach((r) => {
        countsByMatch[r.headshot_id] = Number(r.joined_count) || 0;
      });
    }

    const result = matches.map((m) => {
      const json = m.toJSON();

      json.joined_count = countsByMatch[m.id] || 0;

      // Ensure frontend always receives consistent keys
      json.mode = json.mode ?? null;
      json.prize_pool = Number(json.price_pool ?? 0) || 0;

      return json;
    });

    res.json(result);
  } catch (err) {
    console.error("admin headshot list error", err.message);
    res.status(500).json({ message: "Failed to load headshot tournaments" });
  }
});

/**
 * CREATE headshot tournament
 * POST /api/admin/headshot
 */
router.post("/headshot", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      mode,
      map, // fallback if old frontend sends map instead of mode
      entry_fee,
      prize_pool,
      date,
      slots,
      description,
      status,
    } = req.body;

    const safeStatus = normalizeStatus(status);
    const safeMode = normalizeMode(mode ?? map);

    const match = await Headshot.create({
      name: name || "",
      mode: safeMode,
      entry_fee: parseFloat(entry_fee) || 0,
      price_pool: parseFloat(prize_pool) || 0,
      date,
      slots: parseInt(slots) || 0,
      description: description || "",
      status: safeStatus,
    });

    res.json({ id: match.id, message: "Headshot tournament created" });
  } catch (err) {
    console.error("admin headshot create error:", err.message);
    res.status(500).json({ message: "Failed to create headshot tournament" });
  }
});

/**
 * UPDATE headshot tournament
 * PUT /api/admin/headshot/:id
 */
router.put("/headshot/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      mode,
      map, // fallback
      entry_fee,
      prize_pool,
      date,
      slots,
      description,
      status,
    } = req.body;

    const safeStatus = normalizeStatus(status);
    const safeMode = normalizeMode(mode ?? map);

    const match = await Headshot.findByPk(id);
    if (!match) return res.status(404).json({ message: "Headshot match not found" });

    match.name = name || "";
    match.mode = safeMode;
    match.entry_fee = parseFloat(entry_fee) || 0;
    match.price_pool = parseFloat(prize_pool) || 0;
    match.date = date;
    match.slots = parseInt(slots) || 0;
    match.description = description || "";
    match.status = safeStatus;

    await match.save();

    res.json({ message: "Headshot tournament updated" });
  } catch (err) {
    console.error("admin headshot update error:", err.message);
    res.status(500).json({ message: "Failed to update headshot tournament" });
  }
});

/**
 * UPDATE status only
 * PATCH /api/admin/headshot/:id/status
 */
router.patch("/headshot/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const safeStatus = normalizeStatus(status);

    const match = await Headshot.findByPk(id);
    if (!match) return res.status(404).json({ message: "Headshot match not found" });

    match.status = safeStatus;
    await match.save();

    res.json({ message: "Status updated" });
  } catch (err) {
    console.error("admin headshot status error:", err.message);
    res.status(500).json({ message: "Failed to update status" });
  }
});

/**
 * UPDATE room details
 * PATCH /api/admin/headshot/:id/room
 */
router.patch("/headshot/:id/room", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, room_password } = req.body;

    const match = await Headshot.findByPk(id);
    if (!match) return res.status(404).json({ message: "Headshot match not found" });

    match.room_id = room_id || null;
    match.room_password = room_password || null;
    await match.save();

    res.json({ message: "Room updated" });
  } catch (err) {
    console.error("admin headshot room error:", err.message);
    res.status(500).json({ message: "Failed to update room details" });
  }
});

/**
 * GET players for a match
 * GET /api/admin/headshot/:id/players
 */
router.get("/headshot/:id/players", requireAdmin, async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);

    const parts = await Participation.findAll({
      where: { headshot_id: matchId },
      order: [["id", "ASC"]],
    });

    if (parts.length === 0) return res.json({ players: [], count: 0 });

    const userIds = [...new Set(parts.map((p) => p.user_id))];
    const users = await User.findAll({ where: { id: userIds } });

    const userMap = {};
    users.forEach((u) => (userMap[u.id] = u));

    const players = parts.map((row) => {
      const u = userMap[row.user_id];
      return {
        id: row.id,
        user_id: row.user_id,
        name: u?.name || "Unknown",
        email: u?.email || "",
        phone: u?.phone || "",
        freefireId: u?.game_id || "",
        team_side: row.team_side || null,
      };
    });

    res.json({ players, count: players.length });
  } catch (err) {
    console.error("admin headshot players error:", err.message);
    res.status(500).json({ message: "Failed to load players" });
  }
});

/**
 * DELETE headshot tournament (and its participations)
 * DELETE /api/admin/headshot/:id
 */
router.delete("/headshot/:id", requireAdmin, async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id);

    const match = await Headshot.findByPk(id, { transaction: tx });
    if (!match) {
      await tx.rollback();
      return res.status(404).json({ message: "Headshot match not found" });
    }

    await sequelize.query(`DELETE FROM participations WHERE headshot_id = ?`, {
      replacements: [id],
      transaction: tx,
    });

    await match.destroy({ transaction: tx });

    await tx.commit();
    res.json({ message: "Headshot match deleted successfully" });
  } catch (err) {
    await tx.rollback();
    console.error("admin headshot delete error:", err.message);
    res.status(500).json({ message: "Failed to delete headshot match" });
  }
});

export default router;