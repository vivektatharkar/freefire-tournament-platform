// backend/routes/verification.js
import express from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";

const router = express.Router();

// In-memory store: { [email]: { otpHash, expires } }
const EMAIL_OTP_STORE = Object.create(null);

function sha(str) {
  return crypto.createHash("sha256").update(String(str)).digest("hex");
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log("OTP EMAIL ENV:", {
    host,
    port: String(port),
    user,
    pass: pass ? "***set***" : "",
  });

  if (!host || !user || !pass) {
    console.log(
      "OTP EMAIL: DEV MODE (no SMTP_HOST / SMTP_USER / SMTP_PASS). OTP only printed in console."
    );
    return null; // dev mode
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * POST /api/verify/send-email
 * body: { email }
 */
router.post("/send-email", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const otp = generateOtp();
    EMAIL_OTP_STORE[email] = {
      otpHash: sha(otp),
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    };

    const transporter = createTransport();
    if (!transporter) {
      console.log(`[EMAIL OTP] to ${email}: ${otp}`);
      return res.json({
        message: "Email OTP sent (dev). Check backend console or real email.",
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

    console.log(`[EMAIL OTP] to ${email}: ${otp}`);
    return res.json({ message: "Email OTP sent." });
  } catch (err) {
    console.error("send-email error:", err);
    return res
      .status(500)
      .json({ message: "Failed to send OTP", error: err.message });
  }
});

/**
 * POST /api/verify/confirm-email
 * body: { email, otp }
 */
router.post("/confirm-email", (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res
        .status(400)
        .json({ message: "Email and OTP are required" });
    }

    const rec = EMAIL_OTP_STORE[email];
    if (!rec) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    if (Date.now() > rec.expires) {
      delete EMAIL_OTP_STORE[email];
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    if (sha(otp) !== rec.otpHash) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    delete EMAIL_OTP_STORE[email];
    return res.json({ message: "Email verified" });
  } catch (err) {
    console.error("confirm-email error:", err);
    return res
      .status(500)
      .json({ message: "Failed to verify OTP", error: err.message });
  }
});

export default router;