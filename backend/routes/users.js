// backend/routes/users.js
import express from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

const router = express.Router();

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = decoded;
    next();
  } catch (err) {
    console.error("AUTH ERROR:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
}

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "role",
        "wallet_balance",
        "game_id",
        "created_at",
        "updated_at",
      ],
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (err) {
    console.error("GET /users/me error:", err);
    return res.status(500).json({ message: "Failed to load profile" });
  }
});

async function updateMeHandler(req, res) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    let { name, phone, game_id, freefireId } = req.body;

    if (typeof name === "string") {
      name = name.trim();
      if (!name) return res.status(400).json({ message: "Name cannot be empty" });
      user.name = name;
    }

    if (typeof phone === "string") {
      phone = phone.trim();
      if (phone && !/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({ message: "Phone must be exactly 10 digits" });
      }
      user.phone = phone || null;
    }

    // Accept either game_id or freefireId from frontend
    if (typeof game_id === "string") {
      user.game_id = game_id.trim();
    } else if (typeof freefireId === "string") {
      user.game_id = freefireId.trim();
    }

    await user.save();

    return res.json({
      message: "Profile updated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        game_id: user.game_id,
        wallet_balance: user.wallet_balance,
      },
    });
  } catch (err) {
    console.error("PUT /users/me error:", err);
    return res.status(500).json({ message: "Failed to update profile" });
  }
}

router.put("/me", authMiddleware, updateMeHandler);
router.put("/profile", authMiddleware, updateMeHandler);

export default router;