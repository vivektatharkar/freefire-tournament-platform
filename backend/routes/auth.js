// backend/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { User } from "../models/index.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  AUTH ME: GET /api/auth/me                                         */
/* ------------------------------------------------------------------ */
router.get("/me", auth, async (req, res) => {
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
        "last_login_at",
        "last_active_at",
      ],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ NEW: update last active (used for admin "online users")
    try {
      await user.update({ last_active_at: new Date() });
    } catch (e) {
      // don't break flow if column not added yet
    }

    return res.json({ user });
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    return res.status(500).json({ message: "Failed to load user" });
  }
});

/* ------------------------------------------------------------------ */
/*  HELPER: create email transporter                                  */
/* ------------------------------------------------------------------ */
function createMailer() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.log(
      "OTP EMAIL: DEV MODE (no SMTP_USER / SMTP_PASS). OTP will only be logged."
    );
    return null;
  }

  console.log("OTP EMAIL ENV:", {
    host,
    port: String(port),
    user,
    pass: "***set***",
  });

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
  });
}

/* ------------------------------------------------------------------ */
/*  SIGNUP OTP: POST /api/auth/send-otp                               */
/* ------------------------------------------------------------------ */

// in‑memory store: email -> { code, expires }
const SIGNUP_OTPS = new Map();

router.post("/send-otp", async (req, res) => {
  try {
    let { email } = req.body;
    email = (email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Date.now() + 10 * 60 * 1000;

    SIGNUP_OTPS.set(email, { code, expires });

    const transporter = createMailer();

    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email,
          subject: "Signup OTP - Freefire Tournament",
          text: `Your OTP for signup is: ${code}

This code is valid for 10 minutes.`,
        });
        console.log(`[SIGNUP OTP EMAIL] to ${email}: ${code}`);
        return res.json({ message: "OTP sent to your email" });
      } catch (mailErr) {
        console.error("SIGNUP OTP SEND ERROR:", mailErr);
      }
    }

    console.log(
      `[SIGNUP OTP - DEV MODE] to ${email}: ${code} (no SMTP config or send error)`
    );
    return res.json({
      message: "OTP generated (dev mode). Check backend console for the code.",
    });
  } catch (err) {
    console.error("SEND-OTP ERROR:", err);
    return res
      .status(500)
      .json({ message: "Failed to send OTP", error: err.message || String(err) });
  }
});

/* ------------------------------------------------------------------ */
/*  SIGNUP: POST /api/auth/signup                                     */
/* ------------------------------------------------------------------ */
router.post("/signup", async (req, res) => {
  try {
    let { name, email, phone, password } = req.body;

    name = (name || "").trim();
    email = (email || "").trim().toLowerCase();
    phone = phone ? String(phone).trim() : "";
    password = password || "";

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }

    if (phone) {
      if (!/^[0-9]{10}$/.test(phone)) {
        return res
          .status(400)
          .json({ message: "Phone must be exactly 10 digits" });
      }
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already registered" });
    }

    if (phone) {
      const existingPhone = await User.findOne({ where: { phone } });
      if (existingPhone) {
        return res.status(400).json({ message: "Phone number already used" });
      }
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone: phone || null,
      password_hash: hash,
      game_id: "",
      // ✅ NEW (safe even if DB not altered yet)
      last_login_at: null,
      last_active_at: null,
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "7d" }
    );

    SIGNUP_OTPS.delete(email);

    return res.json({
      message: "Signup successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        wallet_balance: user.wallet_balance,
        game_id: user.game_id,
      },
    });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    return res
      .status(500)
      .json({ message: "Signup failed", error: err.message || String(err) });
  }
});

/* ------------------------------------------------------------------ */
/*  LOGIN: POST /api/auth/login                                       */
/* ------------------------------------------------------------------ */
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;
    email = (email || "").trim().toLowerCase();
    password = password || "";

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ NEW: store login + active timestamps for admin dashboard
    try {
      await user.update({ last_login_at: new Date(), last_active_at: new Date() });
    } catch (e) {
      // don't break flow if column not added yet
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        wallet_balance: user.wallet_balance,
        game_id: user.game_id,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res
      .status(500)
      .json({ message: "Login failed", error: err.message || String(err) });
  }
});

/* ------------------------------------------------------------------ */
/*  FORGOT PASSWORD FLOW (unchanged)                                  */
/* ------------------------------------------------------------------ */

// email → { code, expires }
const RESET_TOKENS = new Map();

router.post("/forgot-start", async (req, res) => {
  try {
    let { email } = req.body;
    email = (email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "No user found with this email" });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Date.now() + 10 * 60 * 1000;

    RESET_TOKENS.set(email, { code, expires });

    const transporter = createMailer();

    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email,
          subject: "Password reset OTP - Freefire Tournament",
          text: `Your OTP to reset your password is: ${code}

This code is valid for 10 minutes.`,
        });
        console.log(`[RESET EMAIL OTP] to ${email}: ${code}`);
        return res.json({ message: "Reset OTP sent to your email" });
      } catch (mailErr) {
        console.error("RESET EMAIL SEND ERROR:", mailErr);
      }
    }

    console.log(
      `[RESET EMAIL OTP - DEV MODE] to ${email}: ${code} (no SMTP config or send error)`
    );
    return res.json({
      message:
        "Reset OTP generated (dev mode). Check backend console for the code.",
    });
  } catch (err) {
    console.error("FORGOT-START ERROR:", err);
    return res.status(500).json({
      message: "Failed to start password reset",
      error: err.message || String(err),
    });
  }
});

router.post("/forgot-complete", async (req, res) => {
  try {
    let { email, code, newPassword } = req.body;
    email = (email || "").trim().toLowerCase();
    code = (code || "").trim();
    newPassword = newPassword || "";

    if (!email || !code || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email, OTP and new password are required" });
    }

    const rec = RESET_TOKENS.get(email);
    if (!rec) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }
    if (Date.now() > rec.expires) {
      RESET_TOKENS.delete(email);
      return res.status(400).json({ message: "OTP expired or not found" });
    }
    if (rec.code !== code) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      RESET_TOKENS.delete(email);
      return res.status(400).json({ message: "User not found" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    user.password_hash = hash;
    await user.save();

    RESET_TOKENS.delete(email);

    return res.json({
      message: "Password reset successful. You can now login with new password.",
    });
  } catch (err) {
    console.error("FORGOT-COMPLETE ERROR:", err);
    return res.status(500).json({
      message: "Failed to reset password",
      error: err.message || String(err),
    });
  }
});

export default router;