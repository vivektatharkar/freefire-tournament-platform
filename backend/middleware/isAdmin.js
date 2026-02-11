// backend/middleware/isAdmin.js
export default function isAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });

  const role = String(req.user.role || "").toLowerCase();

  // ✅ allow both admin and superadmin
  if (role !== "admin" && role !== "superadmin") {
    return res.status(403).json({ message: "Admin only" });
  }

  return next();
}