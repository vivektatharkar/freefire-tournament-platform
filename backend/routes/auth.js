// backend/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { User } from "../models/index.js";

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  HELPER: create email transporter (same env as signup OTP emails)  */
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
/*  SIGNUP (frontend already ensured email OTP is verified)           */
/*  POST /api/auth/signup                                             */
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

    // Phone: exactly 10 digits if provided
    if (phone) {
      if (!/^[0-9]{10}$/.test(phone)) {
        return res
          .status(400)
          .json({ message: "Phone must be exactly 10 digits" });
      }
    }

    // uniqueness checks
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
      // ✅ init game_id as empty string
      game_id: "",
    });

    // ✅ include role in token so adminOnly works
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "7d" }
    );

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
/*  LOGIN                                                              */
/*  POST /api/auth/login                                               */
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

    // ✅ include role so adminOnly can see admin
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
/*  FORGOT PASSWORD - in-memory reset tokens                          */
/* ------------------------------------------------------------------ */

// email → { code, expires }
const RESET_TOKENS = new Map();

/**
 * POST /api/auth/forgot-start
 * Body: { email }
 * Sends an OTP to the given email (if user exists).
 */
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

    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    RESET_TOKENS.set(email, { code, expires });

    const transporter = createMailer();

    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email,
          subject: "Password reset OTP - Freefire Tournament",
          text: `Your OTP to reset your password is: ${code}\n\nThis code is valid for 10 minutes.`,
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

/**
 * POST /api/auth/forgot-complete
 * Body: { email, code, newPassword }
 * Verifies OTP and updates password_hash.
 */
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