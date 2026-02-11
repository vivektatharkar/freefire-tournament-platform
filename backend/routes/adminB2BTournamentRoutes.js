// backend/routes/adminB2BTournamentRoutes.js
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

function normalizeMode(mode) {
  const m = String(mode || "").trim().toLowerCase();
  if (m === "solo" || m === "duo" || m === "squad") return m;
  return "solo";
}

// GET all B2B matches (admin)
router.get("/b2b", requireAdmin, async (req, res) => {
  try {
    const matches = await selectQuery(
      `SELECT
         m.id,
         m.name,
         m.date,
         m.entry_fee,
         m.prize_pool,
         m.slots,
         m.status,
         m.is_locked,
         m.mode,
         m.description,
         m.room_id,
         m.room_password,
         m.created_at,
         m.updated_at
       FROM b2bmatches m
       ORDER BY m.id DESC`
    );

    const ids = matches.map((m) => m.id);
    let countsByMatch = {};

    if (ids.length > 0) {
      const [rows] = await sequelize.query(
        `SELECT b2b_id, COUNT(*) AS joined_count
         FROM participations
         WHERE b2b_id IN (${ids.map(() => "?").join(",")})
         GROUP BY b2b_id`,
        { replacements: ids }
      );

      rows.forEach((r) => {
        countsByMatch[r.b2b_id] = Number(r.joined_count) || 0;
      });
    }

    const result = matches.map((m) => ({
      ...m,
      joined_count: countsByMatch[m.id] || 0,
    }));

    res.json(result);
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
      prize_pool,
      date,
      slots,
      description,
      status,
      mode,
      is_locked,
    } = req.body;

    const normalizedMode = normalizeMode(mode);

    await sequelize.query(
      `INSERT INTO b2bmatches
        (name, entry_fee, prize_pool, date, slots, description,
         status, mode, is_locked, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      {
        replacements: [
          name || "",
          Number(entry_fee) || 0,
          Number(prize_pool) || 0,
          date || null,
          Number(slots) || 0,
          description || "",
          status || "upcoming",
          normalizedMode,
          is_locked ? 1 : 0,
        ],
      }
    );

    res.json({ message: "Success" });
  } catch (err) {
    console.error("admin b2b tournament create error", err);
    res.status(500).json({ message: "Failed" });
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
      mode,
      is_locked,
    } = req.body;

    const normalizedMode = normalizeMode(mode);

    await sequelize.query(
      `UPDATE b2bmatches
       SET name = ?,
           entry_fee = ?,
           prize_pool = ?,
           date = ?,
           slots = ?,
           description = ?,
           status = ?,
           mode = ?,
           is_locked = ?,
           updated_at = NOW()
       WHERE id = ?`,
      {
        replacements: [
          name || "",
          Number(entry_fee) || 0,
          Number(prize_pool) || 0,
          date || null,
          Number(slots) || 0,
          description || "",
          status || "upcoming",
          normalizedMode,
          is_locked ? 1 : 0,
          Number(id),
        ],
      }
    );

    res.json({ message: "Updated" });
  } catch (err) {
    console.error("admin b2b tournament update error", err);
    res.status(500).json({ message: "Failed" });
  }
});

// LOCK / UNLOCK
router.patch("/b2b/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_locked, status } = req.body;

    const nextLocked =
      typeof is_locked !== "undefined"
        ? !!is_locked
        : String(status || "").toLowerCase() === "locked";

    await sequelize.query(
      `UPDATE b2bmatches
       SET is_locked = ?, updated_at = NOW()
       WHERE id = ?`,
      { replacements: [nextLocked ? 1 : 0, Number(id)] }
    );

    res.json({ message: "Lock state updated", is_locked: nextLocked ? 1 : 0 });
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
      { replacements: [room_id || null, room_password || null, Number(id)] }
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
    const matchId = Number(req.params.id);

    const parts = await Participation.findAll({
      where: { b2b_id: matchId },
      order: [["id", "ASC"]],
    });

    if (parts.length === 0) return res.json({ players: [] });

    const userIds = [...new Set(parts.map((p) => p.user_id))];
    const users = await User.findAll({ where: { id: userIds } });

    const userMap = {};
    users.forEach((u) => (userMap[u.id] = u));

    const players = parts.map((row) => {
      const u = userMap[row.user_id];
      return {
        id: row.id,
        name: u?.name || "Unknown",
        email: u?.email || "",
        phone: u?.phone || "",
        freefireId: u?.game_id || "",
        team_side: row.team_side || null,
      };
    });

    res.json({ players });
  } catch (err) {
    console.error("admin b2b players error", err);
    res.status(500).json({ message: "Failed to load players" });
  }
});

// DELETE B2B match (and its participations)
router.delete("/b2b/:id", requireAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = Number(req.params.id);

    const existing = await sequelize.query(
      `SELECT id FROM b2bmatches WHERE id = ? LIMIT 1`,
      { replacements: [id], type: sequelize.QueryTypes.SELECT, transaction: t }
    );

    if (!existing || existing.length === 0) {
      await t.rollback();
      return res.status(404).json({ message: "B2B match not found" });
    }

    await sequelize.query(`DELETE FROM participations WHERE b2b_id = ?`, {
      replacements: [id],
      transaction: t,
    });

    await sequelize.query(`DELETE FROM b2bmatches WHERE id = ?`, {
      replacements: [id],
      transaction: t,
    });

    await t.commit();
    res.json({ message: "B2B match deleted successfully" });
  } catch (err) {
    await t.rollback();
    console.error("admin b2b delete error", err);
    res.status(500).json({ message: "Failed to delete B2B match" });
  }
});

export default router;