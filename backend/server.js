// server.js (or index.js)

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// POST /api/verify/send-email  <-- this is what your frontend is calling
app.post("/api/verify/send-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // TODO: generate OTP and send email here
    // Example:
    // const otp = Math.floor(100000 + Math.random() * 900000);
    // await sendOtpMail(email, otp);

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("send-email error:", err);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
});

// Optional: health route
app.get("/", (req, res) => {
  res.send("API is running");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
