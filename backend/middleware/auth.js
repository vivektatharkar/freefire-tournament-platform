// backend/middleware/auth.js
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = header.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret");
    if (!decoded?.id) return res.status(401).json({ message: "Invalid token" });

    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "email", "role"],
    });
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}