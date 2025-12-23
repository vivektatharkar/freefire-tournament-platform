// backend/routes/adminB2BTournamentRoutes.js
import express from "express";
import sequelize from "../config/db.js";
import { auth } from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();
const requireAdmin = [auth, isAdmin];

// helper for SELECT queries
const selectQuery = (sql, params = []) =>
  sequelize.query(sql, {
    replacements: params,
    type: sequelize.QueryTypes.SELECT,
  });

/**
 * IMPORTANT:
 * - DB table name: b2bmatches
 * - Columns: id, name, date, entry_fee, prize_pool, slots,
 *            status, is_locked, description,
 *            room_id, room_password, created_at, updated_at
 * - Join table: b2b_match_joins (id, match_id, user_id, team_side, ...)
 * - Users table: users (must contain column game_id for the player ID)
 */

// GET all B2B matches
router.get("/b2b", requireAdmin, async (req, res) => {
  try {
    const rows = await selectQuery(
      `SELECT
         m.id,
         m.name,
         m.date,
         m.entry_fee,
         m.prize_pool AS prize_pool,
         m.slots,
         m.status,
         m.is_locked,
         m.description,
         m.room_id,
         m.room_password,
         COUNT(j.id) AS joined_count
       FROM b2bmatches m
       LEFT JOIN b2b_match_joins j ON j.match_id = m.id
       GROUP BY m.id
       ORDER BY m.id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("admin b2b tournament list error", err);
    res.status(500).json({ message: "Failed to load B2B matches" });
  }
});

// CREATE B2B match
router.post("/b2b", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      entry_fee,
      prize_pool, // from frontend
      date,
      slots,
      description,
      status,
    } = req.body;

    const [result, meta] = await sequelize.query(
      `INSERT INTO b2bmatches
         (name, entry_fee, prize_pool, date, slots, description,
          status, is_locked, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      {
        replacements: [
          name,
          entry_fee,
          prize_pool,
          date,
          slots,
          description,
          status || "upcoming",
        ],
      }
    );

    const insertedId = meta?.insertId ?? result?.insertId ?? null;
    res.json({ id: insertedId });
  } catch (err) {
    console.error("admin b2b tournament create error", err);
    res.status(500).json({ message: "Failed to create B2B match" });
  }
});

// UPDATE B2B match
router.put("/b2b/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      entry_fee,
      prize_pool,
      date,
      slots,
      description,
      status,
    } = req.body;

    await sequelize.query(
      `UPDATE b2bmatches
       SET name = ?,
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
          name,
          entry_fee,
          prize_pool,
          date,
          slots,
          description,
          status,
          id,
        ],
      }
    );

    res.json({ message: "Updated" });
  } catch (err) {
    console.error("admin b2b tournament update error", err);
    res.status(500).json({ message: "Failed to update B2B match" });
  }
});

// LOCK / UNLOCK (status and is_locked)
router.patch("/b2b/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, is_locked } = req.body;

    await sequelize.query(
      `UPDATE b2bmatches
       SET status = ?, is_locked = ?, updated_at = NOW()
       WHERE id = ?`,
      {
        replacements: [status, is_locked ? 1 : 0, id],
      }
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    console.error("admin b2b status error", err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

// UPDATE room details
router.patch("/b2b/:id/room", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, room_password } = req.body;

    await sequelize.query(
      `UPDATE b2bmatches
       SET room_id = ?, room_password = ?, updated_at = NOW()
       WHERE id = ?`,
      { replacements: [room_id, room_password, id] }
    );

    res.json({ message: "Room updated" });
  } catch (err) {
    console.error("admin b2b room error", err);
    res.status(500).json({ message: "Failed to update room details" });
  }
});

// GET players for a B2B match
router.get("/b2b/:id/players", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const players = await selectQuery(
      `SELECT
         j.id,
         u.name,
         u.email,
         u.phone,
         u.game_id AS freefireId,
         j.team_side
       FROM b2b_match_joins j
       JOIN users u ON u.id = j.user_id
       WHERE j.match_id = ?
       ORDER BY j.id ASC`,
      [id]
    );

    res.json({ players });
  } catch (err) {
    console.error("admin b2b players error", err);
    res.status(500).json({ message: "Failed to load players" });
  }
});

export default router;