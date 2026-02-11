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
 * GET all tournaments (admin list)
 * GET /api/admin/tournaments
 */
router.get("/tournaments", requireAdmin, async (req, res) => {
  try {
    const rows = await selectQuery(
      `SELECT
         t.id,
         t.name,
         COALESCE(t.mode, '') as mode,
         t.entry_fee,
         COALESCE(t.price_pool, 0) as prize_pool,
         t.date,
         t.slots,
         t.status,
         t.is_locked,
         t.description,
         t.room_id,
         t.room_password,
         COALESCE(COUNT(p.id), 0) AS joined_count
       FROM tournaments t
       LEFT JOIN participations p ON p.tournament_id = t.id
       GROUP BY t.id
       ORDER BY t.id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("admin tournaments list error", err.message);
    res.status(500).json({ message: "Failed to load tournaments" });
  }
});

/**
 * CREATE tournament
 * POST /api/admin/tournaments
 */
router.post("/tournaments", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      mode,
      entry_fee,
      prize_pool,
      date,
      slots,
      description,
      status,
    } = req.body;

    const [result, meta] = await sequelize.query(
      `INSERT INTO tournaments
         (name, mode, entry_fee, price_pool, date, slots, description,
          status, is_locked, room_id, room_password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, NOW(), NOW())`,
      {
        replacements: [
          name || "",
          mode || null,
          parseFloat(entry_fee) || 0,
          parseFloat(prize_pool) || 0,
          date,
          parseInt(slots) || 0,
          description || "",
          status || "upcoming",
        ],
      }
    );

    const insertedId = meta?.insertId ?? result?.insertId ?? null;
    res.json({ id: insertedId, message: "Tournament created successfully" });
  } catch (err) {
    console.error("admin tournament create error:", err.message);
    res.status(500).json({ message: "Failed to create tournament" });
  }
});

/**
 * UPDATE tournament details
 * PUT /api/admin/tournaments/:id
 */
router.put("/tournaments/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      mode,
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
           mode = ?,
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
          name || "",
          mode || null,
          parseFloat(entry_fee) || 0,
          parseFloat(prize_pool) || 0,
          date,
          parseInt(slots) || 0,
          description || "",
          status || "upcoming",
          parseInt(id),
        ],
      }
    );

    res.json({ message: "Tournament updated successfully" });
  } catch (err) {
    console.error("admin tournament update error:", err.message);
    res.status(500).json({ message: "Failed to update tournament" });
  }
});

/**
 * LOCK / UNLOCK tournament
 * PATCH /api/admin/tournaments/:id/status
 */
router.patch("/tournaments/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_locked } = req.body;

    await sequelize.query(
      `UPDATE tournaments
       SET is_locked = ?, updated_at = NOW()
       WHERE id = ?`,
      {
        replacements: [is_locked ? 1 : 0, parseInt(id)],
      }
    );

    res.json({ message: "Status updated" });
  } catch (err) {
    console.error("admin tournament status error:", err.message);
    res.status(500).json({ message: "Failed to update status" });
  }
});

/**
 * UPDATE room details
 * PATCH /api/admin/tournaments/:id/room
 */
router.patch("/tournaments/:id/room", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, room_password } = req.body;

    await sequelize.query(
      `UPDATE tournaments
       SET room_id = ?, room_password = ?, updated_at = NOW()
       WHERE id = ?`,
      {
        replacements: [room_id || null, room_password || null, parseInt(id)],
      }
    );

    res.json({ message: "Room updated" });
  } catch (err) {
    console.error("admin tournament room error:", err.message);
    res.status(500).json({ message: "Failed to update room" });
  }
});

/**
 * GET players for tournament
 * GET /api/admin/tournaments/:id/players
 */
router.get("/tournaments/:id/players", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

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
       WHERE p.tournament_id = ?
       ORDER BY p.id ASC`,
      [parseInt(id)]
    );

    res.json({ players });
  } catch (err) {
    console.error("admin tournament players error:", err.message);
    res.status(500).json({ message: "Failed to load players" });
  }
});

/**
 * DELETE tournament (and its participations)
 * DELETE /api/admin/tournaments/:id
 */
router.delete("/tournaments/:id", requireAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = parseInt(req.params.id);

    // check exists
    const rows = await sequelize.query(`SELECT id FROM tournaments WHERE id = ? LIMIT 1`, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT,
      transaction: t,
    });

    if (!rows || rows.length === 0) {
      await t.rollback();
      return res.status(404).json({ message: "Tournament not found" });
    }

    // delete joins first to avoid FK issues
    await sequelize.query(`DELETE FROM participations WHERE tournament_id = ?`, {
      replacements: [id],
      transaction: t,
    });

    // delete tournament
    await sequelize.query(`DELETE FROM tournaments WHERE id = ?`, {
      replacements: [id],
      transaction: t,
    });

    await t.commit();
    res.json({ message: "Tournament deleted successfully" });
  } catch (err) {
    await t.rollback();
    console.error("admin tournament delete error:", err.message);
    res.status(500).json({ message: "Failed to delete tournament" });
  }
});

export default router;