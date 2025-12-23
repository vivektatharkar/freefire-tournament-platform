// backend/routes/adminCsRoutes.js
import express from "express";
import sequelize from "../config/db.js";
import { auth } from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();
const requireAdmin = [auth, isAdmin];

const selectQuery = (sql, params = []) =>
  sequelize.query(sql, {
    replacements: params,
    type: sequelize.QueryTypes.SELECT,
  });

/**
 * Assumed DB schema:
 *  Table: csmatches
 *  Columns:
 *    id, name, date, entry_fee, prize_pool,
 *    slots, status, description, room_id, room_password,
 *    created_at, updated_at
 *
 *  Table: cs_match_joins
 *    id, match_id, user_id, team_side, created_at, updated_at
 */

// GET all CS matches
router.get("/cs", requireAdmin, async (req, res) => {
  try {
    const rows = await selectQuery(
      `SELECT 
         c.id,
         c.name,
         c.date,
         c.entry_fee,
         c.prize_pool AS prize_pool,
         c.slots,
         c.status,
         c.description,
         c.room_id,
         c.room_password,
         COUNT(j.id) AS joined_count
       FROM csmatches c
       LEFT JOIN cs_match_joins j ON j.match_id = c.id
       GROUP BY c.id
       ORDER BY c.id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("admin cs list error", err);
    res.status(500).json({ message: "Failed to load CS matches" });
  }
});

// CREATE CS match
router.post("/cs", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      entry_fee,
      prize_pool,   // from frontend
      date,
      slots,
      description,
      status,
    } = req.body;

    const [result, meta] = await sequelize.query(
      `INSERT INTO csmatches
         (name, entry_fee, prize_pool, date, slots, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
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
    console.error("admin cs create error", err);
    res.status(500).json({ message: "Failed to create CS match" });
  }
});

// UPDATE CS match
router.put("/cs/:id", requireAdmin, async (req, res) => {
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
      `UPDATE csmatches
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
    console.error("admin cs update error", err);
    res.status(500).json({ message: "Failed to update CS match" });
  }
});

// UPDATE CS status only
router.patch("/cs/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await sequelize.query(
      `UPDATE csmatches
       SET status = ?, updated_at = NOW()
       WHERE id = ?`,
      { replacements: [status, id] }
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    console.error("admin cs status error", err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

// UPDATE CS room details
router.patch("/cs/:id/room", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, room_password } = req.body;

    await sequelize.query(
      `UPDATE csmatches
       SET room_id = ?, room_password = ?, updated_at = NOW()
       WHERE id = ?`,
      { replacements: [room_id, room_password, id] }
    );

    res.json({ message: "Room updated" });
  } catch (err) {
    console.error("admin cs room error", err);
    res.status(500).json({ message: "Failed to update room details" });
  }
});

// GET players for a CS match
router.get("/cs/:id/players", requireAdmin, async (req, res) => {
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
       FROM cs_match_joins j
       JOIN users u ON u.id = j.user_id
       WHERE j.match_id = ?
       ORDER BY j.id ASC`,
      [id]
    );

    res.json({ players });
  } catch (err) {
    console.error("admin cs players error", err);
    res.status(500).json({ message: "Failed to load players" });
  }
});

export default router;