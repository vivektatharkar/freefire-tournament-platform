// backend/app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

// routes
import authRoutes from "./routes/auth.js";
import verifyRoutes from "./routes/verification.js";
import usersRoutes from "./routes/users.js";
import paymentsRoutes from "./routes/payments.js";
import tournamentsRoutes from "./routes/tournaments.js";
import b2bRoutes from "./routes/b2b.js";
import csRoutes from "./routes/cs.js";
import headshotRoutes from "./routes/headshot.js";
import walletRoutes from "./routes/wallet.js";
import notificationRoutes from "./routes/notifications.js";

// admin
import adminWithdrawalsRoutes from "./routes/adminWithdrawals.js";
import adminHeadshotRoutes from "./routes/adminHeadshotRoutes.js";
import adminTournamentRoutes from "./routes/adminTournamentRoutes.js";
import adminB2BTournamentRoutes from "./routes/adminB2BTournamentRoutes.js";
import adminCsRoutes from "./routes/adminCsRoutes.js";
import adminUsersRouter from "./routes/adminUsers.js";
import adminPaymentsRouter from "./routes/adminPayments.js";

const app = express();

/* ---------------- LOGGING ---------------- */
app.use(morgan("dev"));

/* ---------------- SECURITY ---------------- */
app.use(helmet());

/* ---------------- CORS ---------------- */
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

/* ---------------- PARSERS ---------------- */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

/* ---------------- HEALTH ---------------- */
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", time: new Date().toISOString() });
});

/* ---------------- API ROUTES ---------------- */
app.use("/api/auth", authRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/tournaments", tournamentsRoutes);
app.use("/api/b2b", b2bRoutes);
app.use("/api/cs", csRoutes);
app.use("/api/headshot", headshotRoutes);
app.use("/api/notifications", notificationRoutes);

/* ---------------- ADMIN ROUTES ---------------- */
app.use("/api/admin", adminWithdrawalsRoutes);
app.use("/api/admin", adminHeadshotRoutes);
app.use("/api/admin", adminTournamentRoutes);
app.use("/api/admin", adminB2BTournamentRoutes);
app.use("/api/admin", adminCsRoutes);
app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin", adminPaymentsRouter);

/* ---------------- 404 ---------------- */
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

/* ---------------- ERROR HANDLER ---------------- */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal Server Error" });
});

export default app;
