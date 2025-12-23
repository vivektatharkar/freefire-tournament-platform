// backend/routes/adminHeadshotRoutes.js
import express from "express";
import sequelize from "../config/db.js";
import { auth } from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

// Helper SELECT
const selectQuery = (sql, params = []) =>
  sequelize.query(sql, {
    replacements: params,
    type: sequelize.QueryTypes.SELECT,
  });

const requireAdmin = [auth, isAdmin];

/**
 * IMPORTANT:
 * - headshot table: headshot
 * - join table: headshot_joins (id, match_id, user_id, team_side, ...)
 * - users table must contain column game_id (player game id)
 */

// GET all headshot tournaments
router.get("/headshot", requireAdmin, async (req, res) => {
  try {
    const rows = await selectQuery(
      `SELECT h.*,
              COUNT(j.id) AS joined_count
       FROM headshot h
       LEFT JOIN headshot_joins j ON j.match_id = h.id
       GROUP BY h.id
       ORDER BY h.id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("admin headshot list error", err);
    res.status(500).json({ message: "Failed to load headshot tournaments" });
  }
});

// CREATE headshot tournament
router.post("/headshot", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      entry_fee,
      prize_pool,
      date,          // expect string from <input type="datetime-local">
      slots,
      description,
      status,
    } = req.body;

    const [result, meta] = await sequelize.query(
      `INSERT INTO headshot
         (name, entry_fee, prize_pool, date, slots, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          name,
          entry_fee,
          prize_pool,
          date,        // e.g. "2025-12-21T13:00"
          slots,
          description,
          status || "upcoming",
        ],
      }
    );

    const insertedId = meta?.insertId ?? result?.insertId ?? null;
    res.json({ id: insertedId });
  } catch (err) {
    console.error("admin headshot create error", err);
    res.status(500).json({ message: "Failed to create headshot tournament" });
  }
});

// UPDATE headshot tournament
router.put("/headshot/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      entry_fee,
      prize_pool,
      date,          // plain string again
      slots,
      description,
      status,
    } = req.body;

    await sequelize.query(
      `UPDATE headshot
       SET name = ?, entry_fee = ?, prize_pool = ?, date = ?, slots = ?, description = ?, status = ?
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
    console.error("admin headshot update error", err);
    res.status(500).json({ message: "Failed to update headshot tournament" });
  }
});

// UPDATE status only
router.patch("/headshot/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await sequelize.query(
      `UPDATE headshot SET status = ? WHERE id = ?`,
      { replacements: [status, id] }
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    console.error("admin headshot status error", err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

// UPDATE room details
router.patch("/headshot/:id/room", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, room_password } = req.body;

    await sequelize.query(
      `UPDATE headshot SET room_id = ?, room_password = ? WHERE id = ?`,
      { replacements: [room_id, room_password, id] }
    );

    res.json({ message: "Room updated" });
  } catch (err) {
    console.error("admin headshot room error", err);
    res.status(500).json({ message: "Failed to update room details" });
  }
});

// GET players for a match
router.get("/headshot/:id/players", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const players = await selectQuery(
      `SELECT j.id,
              u.name,
              u.email,
              u.phone,
              u.game_id AS freefireId,
              j.team_side
       FROM headshot_joins j
       JOIN users u ON u.id = j.user_id
       WHERE j.match_id = ?
       ORDER BY j.id ASC`,
      [id]
    );

    res.json({ players });
  } catch (err) {
    console.error("admin headshot players error", err);
    res.status(500).json({ message: "Failed to load players" });
  }
});

export default router;