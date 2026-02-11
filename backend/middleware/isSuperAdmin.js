// backend/middleware/isSuperAdmin.js
import { User } from "../models/index.js";

const SUPERADMIN_EMAILS = ["vivektatharkar@gmail.com"].map((x) =>
  String(x).trim().toLowerCase()
);

export default async function isSuperAdmin(req, res, next) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

    // Fast path (from auth middleware)
    const emailFast = String(req.user.email || "").trim().toLowerCase();
    const roleFast = String(req.user.role || "").trim().toLowerCase();

    if (roleFast === "superadmin") return next();
    if (emailFast && SUPERADMIN_EMAILS.includes(emailFast)) return next();

    // Fallback check from DB (in case req.user doesn't include email)
    const me = await User.findByPk(req.user.id, { attributes: ["id", "email", "role"] });
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const email = String(me.email || "").trim().toLowerCase();
    const role = String(me.role || "").trim().toLowerCase();

    if (role === "superadmin") return next();
    if (email && SUPERADMIN_EMAILS.includes(email)) return next();

    return res.status(403).json({ message: "SuperAdmin only" });
  } catch (err) {
    console.error("isSuperAdmin error:", err);
    return res.status(500).json({ message: "Internal error" });
  }
}