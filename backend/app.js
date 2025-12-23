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
import adminPaymentsRouter from "./routes/adminPayments.js";

// notifications
import notificationRoutes from "./routes/notifications.js";

const app = express();

/* ---------------- LOGGING (FIXED) ---------------- */
if (process.env.NODE_ENV !== "production") {
  app.use(
    morgan("dev", {
      skip: (req, res) =>
        req.method === "OPTIONS" || res.statusCode === 304,
    })
  );
} else {
  app.use(morgan("combined"));
}

/* ---------------- SECURITY ---------------- */
app.use(helmet());

/* ---------------- CORS ---------------- */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  })
);

app.use(cookieParser());

/* ---------------- BODY PARSERS ---------------- */
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

/* ---------------- HEALTH CHECK ---------------- */
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", time: new Date().toISOString() });
});

/* ---------------- PUBLIC APIs ---------------- */
app.use("/api/auth", authRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/tournaments", tournamentsRoutes);
app.use("/api/b2b", b2bRoutes);
app.use("/api/cs", csRoutes);
app.use("/api/headshot", headshotRoutes);

/* ---------------- ADMIN APIs ---------------- */
app.use("/api/admin", adminWithdrawalsRoutes);
app.use("/api/admin", adminHeadshotRoutes);
app.use("/api/admin", adminTournamentRoutes);
app.use("/api/admin", adminB2BTournamentRoutes);
app.use("/api/admin", adminCsRoutes);
app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin", adminPaymentsRouter);

/* ---------------- NOTIFICATIONS ---------------- */
app.use("/api/notifications", notificationRoutes);

/* ---------------- STATIC FRONTEND ---------------- */
/**
 * Folder layout:
 *  C:\freefire-tournament-platform\backend  <-- backend cwd
 *  C:\freefire-tournament-platform\frontend <-- React app
 *  C:\freefire-tournament-platform\frontend\build <-- npm run build output
 *
 * So we go one level up (..) from backend, then into frontend/build.
 */
const frontendBuildPath = path.join(process.cwd(), "..", "frontend", "build");
app.use(express.static(frontendBuildPath));

/* ---------------- API 404 ---------------- */
app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

/* ---------------- FRONTEND FALLBACK ---------------- */
app.get("*", (req, res) => {
  try {
    return res.sendFile(path.join(frontendBuildPath, "index.html"));
  } catch {
    return res.status(404).json({ message: "Not found" });
  }
});

/* ---------------- ERROR HANDLER ---------------- */
app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err?.stack || err);

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  if (Array.isArray(err.errors)) {
    return res.status(status).json({
      message,
      errors: err.errors,
    });
  }

  return res.status(status).json({ message });
});

export default app;