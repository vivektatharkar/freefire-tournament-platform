// backend/routes/adminCsRoutes.js
import express from "express";
import sequelize from "../config/db.js";
import { auth } from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

import { User, Participation } from "../models/index.js";

const router = express.Router();
const requireAdmin = [auth, isAdmin];

const selectQuery = (sql, params = []) =>
  sequelize.query(sql, {
    replacements: params,
    type: sequelize.QueryTypes.SELECT,
  });

/**
 * DB schema used here:
 * Table: csmatches
 *   id, name, mode, date, entry_fee, prize_pool, slots,
 *   status, description, room_id, room_password, created_at, updated_at
 */

// helper status: only upcoming | live | completed
const normalizeStatus = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "upcoming" || s === "live" || s === "completed") return s;
  return "upcoming";
};

const normalizeMode = (mode) => {
  const m = String(mode || "").trim();
  return m.length ? m : null;
};

/* ------------ LIST CS MATCHES ------------ */
// GET /api/admin/cs
router.get("/cs", requireAdmin, async (req, res) => {
  try {
    const [matches] = await sequelize.query(
      `SELECT
         c.id,
         c.name,
         COALESCE(c.mode, '') as mode,
         c.date,
         c.entry_fee,
         COALESCE(c.prize_pool, 0) as prize_pool,
         c.slots,
         c.status,
         c.description,
         c.room_id,
         c.room_password,
         c.created_at,
         c.updated_at
       FROM csmatches c
       ORDER BY c.id DESC`
    );

    const ids = matches.map((m) => m.id);
    let countsByMatch = {};

    if (ids.length > 0) {
      const [rows] = await sequelize.query(
        `SELECT cs_id, COUNT(*) AS joined_count
         FROM participations
         WHERE cs_id IN (${ids.map(() => "?").join(",")})
         GROUP BY cs_id`,
        { replacements: ids }
      );
      rows.forEach((r) => {
        countsByMatch[r.cs_id] = Number(r.joined_count) || 0;
      });
    }

    const result = matches.map((m) => ({
      ...m,
      joined_count: countsByMatch[m.id] || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error("admin cs list error:", err.message);
    res.status(500).json({ message: "Failed to load CS matches" });
  }
});

/* ------------ CREATE CS MATCH ------------ */
// POST /api/admin/cs
router.post("/cs", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      mode,
      map, // <-- frontend currently sends `map` in your CS page
      entry_fee,
      prize_pool,
      date,
      slots,
      description,
      status,
    } = req.body;

    const safeStatus = normalizeStatus(status);
    const safeMode = normalizeMode(mode ?? map); // accept both without breaking flow

    const [result, meta] = await sequelize.query(
      `INSERT INTO csmatches
         (name, mode, entry_fee, prize_pool, date, slots, description, status,
          room_id, room_password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NOW(), NOW())`,
      {
        replacements: [
          name || "",
          safeMode,
          parseFloat(entry_fee) || 0,
          parseFloat(prize_pool) || 0,
          date,
          parseInt(slots) || 0,
          description || "",
          safeStatus,
        ],
      }
    );

    const insertedId = meta?.insertId ?? result?.insertId ?? null;
    res.json({ id: insertedId, message: "CS match created" });
  } catch (err) {
    console.error("admin cs create error:", err.message);
    res.status(500).json({ message: "Failed to create CS match" });
  }
});

/* ------------ UPDATE CS MATCH ------------ */
// PUT /api/admin/cs/:id
router.put("/cs/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      mode,
      map, // <-- accept fallback
      entry_fee,
      prize_pool,
      date,
      slots,
      description,
      status,
    } = req.body;

    const safeStatus = normalizeStatus(status);
    const safeMode = normalizeMode(mode ?? map);

    await sequelize.query(
      `UPDATE csmatches
       SET name = ?,
           mode = ?,
           entry_fee = ?,
           prize_pool = ?,
           date = ?,
           slots = ?,
           description = ?,
           status = ?,
           updated_at = NOW()
       WHERE id = ?`,
      {
        replacements: [
          name || "",
          safeMode,
          parseFloat(entry_fee) || 0,
          parseFloat(prize_pool) || 0,
          date,
          parseInt(slots) || 0,
          description || "",
          safeStatus,
          parseInt(id),
        ],
      }
    );

    res.json({ message: "CS match updated" });
  } catch (err) {
    console.error("admin cs update error:", err.message);
    res.status(500).json({ message: "Failed to update CS match" });
  }
});

/* ------------ UPDATE STATUS ONLY ------------ */
// PATCH /api/admin/cs/:id/status
router.patch("/cs/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const safeStatus = normalizeStatus(status);

    await sequelize.query(
      `UPDATE csmatches
       SET status = ?, updated_at = NOW()
       WHERE id = ?`,
      { replacements: [safeStatus, parseInt(id)] }
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    console.error("admin cs status error:", err.message);
    res.status(500).json({ message: "Failed to update status" });
  }
});

/* ------------ UPDATE ROOM DETAILS ------------ */
// PATCH /api/admin/cs/:id/room
router.patch("/cs/:id/room", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, room_password } = req.body;

    await sequelize.query(
      `UPDATE csmatches
       SET room_id = ?, room_password = ?, updated_at = NOW()
       WHERE id = ?`,
      { replacements: [room_id || null, room_password || null, parseInt(id)] }
    );

    res.json({ message: "Room updated" });
  } catch (err) {
    console.error("admin cs room error:", err.message);
    res.status(500).json({ message: "Failed to update room details" });
  }
});

/* ------------ GET PLAYERS FOR A MATCH ------------ */
// GET /api/admin/cs/:id/players
router.get("/cs/:id/players", requireAdmin, async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);

    const players = await selectQuery(
      `SELECT
         p.id,
         u.id as user_id,
         u.name,
         u.email,
         u.phone,
         u.game_id as freefireId,
         p.team_side
       FROM participations p
       JOIN users u ON u.id = p.user_id
       WHERE p.cs_id = ?
       ORDER BY p.id ASC`,
      [matchId]
    );

    res.json({ players, count: players.length });
  } catch (err) {
    console.error("admin cs players error:", err.message);
    res.status(500).json({ message: "Failed to load players" });
  }
});

/* ------------ DELETE CS MATCH (and participations) ------------ */
// DELETE /api/admin/cs/:id
router.delete("/cs/:id", requireAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id);

    const existing = await sequelize.query(
      `SELECT id FROM csmatches WHERE id = ? LIMIT 1`,
      { replacements: [id], type: sequelize.QueryTypes.SELECT, transaction: t }
    );

    if (!existing || existing.length === 0) {
      await t.rollback();
      return res.status(404).json({ message: "CS match not found" });
    }

    await sequelize.query(`DELETE FROM participations WHERE cs_id = ?`, {
      replacements: [id],
      transaction: t,
    });

    await sequelize.query(`DELETE FROM csmatches WHERE id = ?`, {
      replacements: [id],
      transaction: t,
    });

    await t.commit();
    res.json({ message: "CS match deleted successfully" });
  } catch (err) {
    await t.rollback();
    console.error("admin cs delete error:", err.message);
    res.status(500).json({ message: "Failed to delete CS match" });
  }
});

export default router;