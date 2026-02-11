// backend/app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

// public routes
import authRoutes from "./routes/auth.js";
import verifyRoutes from "./routes/verification.js";
import usersRoutes from "./routes/users.js";
import paymentsRoutes from "./routes/payments.js";
import tournamentsRoutes from "./routes/tournaments.js";
import b2bRoutes from "./routes/b2b.js";
import csRoutes from "./routes/cs.js";
import headshotRoutes from "./routes/headshot.js";
import walletRoutes from "./routes/wallet.js";

// admin routes
import adminWithdrawalsRoutes from "./routes/adminWithdrawals.js";
import adminHeadshotRoutes from "./routes/adminHeadshotRoutes.js";
import adminTournamentRoutes from "./routes/adminTournamentRoutes.js";
import adminB2BTournamentRoutes from "./routes/adminB2BTournamentRoutes.js";
import adminCsRoutes from "./routes/adminCsRoutes.js";
import adminUsersRouter from "./routes/adminUsers.js";
import adminPaymentsRoutes from "./routes/adminPayments.js";
import adminScores from "./routes/adminScores.js";
import adminLeaderboard from "./routes/adminLeaderboard.js";

// ✅ NEW: admin dashboard stats route
import adminDashboardStatsRoutes from "./routes/adminDashboardStats.js";

// notifications
import notificationRoutes from "./routes/notifications.js";

// support routes
import supportRoutes from "./routes/support.js";
import adminSupportRoutes from "./routes/adminSupport.js";

// super admin routes
import superAdminRoutes from "./routes/superAdmin.js";

const app = express();

// Helpful if deployed behind reverse proxy (Render/NGINX/etc.)
app.set("trust proxy", 1);

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  })
);

app.use(cookieParser());

app.use(
  express.json({
    limit: "2mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  })
);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", time: new Date().toISOString() });
});

// public APIs
app.use("/api/auth", authRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/tournaments", tournamentsRoutes);
app.use("/api/b2b", b2bRoutes);
app.use("/api/cs", csRoutes);
app.use("/api/headshot", headshotRoutes);

// Support APIs (user)
app.use("/api/support", supportRoutes);

// Optional quick debug to confirm route is mounted (remove later)
if (process.env.NODE_ENV !== "production") {
  console.log("Mounted user support routes at /api/support");
}

// admin APIs (routers under /api/admin)
app.use("/api/admin", adminWithdrawalsRoutes);
app.use("/api/admin", adminHeadshotRoutes);
app.use("/api/admin", adminTournamentRoutes);
app.use("/api/admin", adminB2BTournamentRoutes);
app.use("/api/admin", adminCsRoutes);
app.use("/api/admin", adminPaymentsRoutes);

// ✅ NEW: dashboard stats
app.use("/api/admin", adminDashboardStatsRoutes);

// admin users (already mounted on /api/admin/users)
app.use("/api/admin/users", adminUsersRouter);

// admin scores (kept as you had)
app.use("/api/admin", adminScores);

// Mount leaderboard on /api/admin/leaderboard
app.use("/api/admin/leaderboard", adminLeaderboard);

// Admin support APIs
app.use("/api/admin", adminSupportRoutes);

// ✅ SuperAdmin APIs
app.use("/api/admin", superAdminRoutes);

// notifications
app.use("/api/notifications", notificationRoutes);

// static frontend
const frontendBuildPath = path.join(process.cwd(), "frontend", "build");
app.use(express.static(frontendBuildPath));

// API 404 (after all API routes)
app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// frontend fallback (after API 404)
app.get("*", (req, res) => {
  try {
    return res.sendFile(path.join(frontendBuildPath, "index.html"));
  } catch (err) {
    return res.status(404).json({ message: "Not found" });
  }
});

// error handler (must be last)
app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err?.stack || err);
  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  if (err.errors && Array.isArray(err.errors)) {
    return res.status(status).json({ message, errors: err.errors });
  }

  return res.status(status).json({ message });
});

export default app;