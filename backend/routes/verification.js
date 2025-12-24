// backend/routes/verification.js
import express from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";

const router = express.Router();

// In-memory OTP store
// { email: { otpHash, expiresAt } }
const EMAIL_OTP_STORE = Object.create(null);

/* ---------------- HELPERS ---------------- */

const hash = (val) =>
  crypto.createHash("sha256").update(String(val)).digest("hex");

const generateOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000)); // 6 digit

function createTransporter() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      "⚠️ SMTP not configured. OTP will NOT be emailed."
    );
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

/* ---------------- SEND OTP ---------------- */

router.post("/send-email", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = generateOtp();

    EMAIL_OTP_STORE[email] = {
      otpHash: hash(otp),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
    };

    const transporter = createTransporter();

    if (!transporter) {
      console.log(`[DEV OTP] ${email} → ${otp}`);
      return res.json({
        message: "OTP generated (dev mode). Check backend console.",
      });
    }

    await transporter.sendMail({
      from:
        process.env.SMTP_FROM ||
        `"Freefire Tournament" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Freefire OTP",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    console.log(`[EMAIL OTP SENT] ${email}`);
    return res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error("OTP SEND ERROR:", err);
    return res.status(500).json({
      message: "Failed to send OTP",
      error: err.message,
    });
  }
});

/* ---------------- VERIFY OTP ---------------- */

router.post("/confirm-email", (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res
        .status(400)
        .json({ message: "Email and OTP are required" });
    }

    const record = EMAIL_OTP_STORE[email];
    if (!record) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    if (Date.now() > record.expiresAt) {
      delete EMAIL_OTP_STORE[email];
      return res.status(400).json({ message: "OTP expired" });
    }

    if (hash(otp) !== record.otpHash) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    delete EMAIL_OTP_STORE[email];
    return res.json({ message: "Email verified successfully" });

  } catch (err) {
    console.error("OTP VERIFY ERROR:", err);
    return res.status(500).json({
      message: "Failed to verify OTP",
      error: err.message,
    });
  }
});

export default router;
