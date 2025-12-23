// backend/routes/adminTournamentRoutes.js
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
 * - DB table name: tournaments
 * - Columns: id, name, date, entry_fee, slots, status, description,
 *            created_at, updated_at, room_id, room_password, price_pool
 */

// GET all tournaments
router.get("/tournaments", requireAdmin, async (req, res) => {
  try {
    const rows = await selectQuery(
      `SELECT 
         t.id,
         t.name,
         t.date,
         t.entry_fee,
         t.price_pool AS prize_pool,
         t.slots,
         t.status,
         t.description,
         t.room_id,
         t.room_password,
         COUNT(j.id) AS joined_count
       FROM tournaments t
       LEFT JOIN tournament_joins j ON j.match_id = t.id
       GROUP BY t.id
       ORDER BY t.id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("admin tournament list error", err);
    res.status(500).json({ message: "Failed to load tournaments" });
  }
});

// CREATE tournament
router.post("/tournaments", requireAdmin, async (req, res) => {
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
      `INSERT INTO tournaments 
         (name, entry_fee, price_pool, date, slots, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      {
        replacements: [
          name,
          entry_fee,
          prize_pool,   // goes into price_pool column
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
    console.error("admin tournament create error", err);
    res.status(500).json({ message: "Failed to create tournament" });
  }
});

// UPDATE tournament
router.put("/tournaments/:id", requireAdmin, async (req, res) => {
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
      `UPDATE tournaments
       SET name = ?,
           entry_fee = ?,
           price_pool = ?,
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
    console.error("admin tournament update error", err);
    res.status(500).json({ message: "Failed to update tournament" });
  }
});

// UPDATE status only
router.patch("/tournaments/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // must be upcoming | ongoing | completed

    await sequelize.query(
      `UPDATE tournaments
       SET status = ?, updated_at = NOW()
       WHERE id = ?`,
      { replacements: [status, id] }
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    console.error("admin tournament status error", err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

// UPDATE room details
router.patch("/tournaments/:id/room", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, room_password } = req.body;

    await sequelize.query(
      `UPDATE tournaments
       SET room_id = ?, room_password = ?, updated_at = NOW()
       WHERE id = ?`,
      { replacements: [room_id, room_password, id] }
    );

    res.json({ message: "Room updated" });
  } catch (err) {
    console.error("admin tournament room error", err);
    res.status(500).json({ message: "Failed to update room details" });
  }
});

// GET players for a tournament
router.get("/tournaments/:id/players", requireAdmin, async (req, res) => {
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
       FROM tournament_joins j
       JOIN users u ON u.id = j.user_id
       WHERE j.match_id = ?
       ORDER BY j.id ASC`,
      [id]
    );

    res.json({ players });
  } catch (err) {
    console.error("admin tournament players error", err);
    res.status(500).json({ message: "Failed to load players" });
  }
});

export default router;