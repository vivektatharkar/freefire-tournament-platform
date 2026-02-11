// frontend/src/pages/auth/Signup.js
import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import bg from "../../assets/bg.jpg";

const pageStyle = {
  minHeight: "100vh",
  margin: 0,
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundImage: `url(${bg})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  position: "relative",
};

const overlayStyle = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at top, rgba(15,23,42,0.5), rgba(15,23,42,0.9))",
};

const cardStyle = {
  position: "relative",
  zIndex: 1,
  width: "420px",
  maxWidth: "95%",
  background: "rgba(15, 23, 42, 0.96)",
  borderRadius: "24px",
  padding: "28px 32px",
  boxShadow: "0 18px 45px rgba(0,0,0,0.8)",
  color: "#f9fafb",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const titleStyle = {
  margin: 0,
  marginBottom: 4,
  fontSize: 26,
  fontWeight: 700,
  textAlign: "center",
};

const subtitleStyle = {
  margin: 0,
  marginBottom: 12,
  fontSize: 13,
  color: "#9ca3af",
  textAlign: "center",
};

const msgBase = {
  margin: 0,
  padding: "8px 10px",
  borderRadius: 8,
  fontSize: 13,
  textAlign: "center",
};
const msgError = { ...msgBase, backgroundColor: "#fee2e2", color: "#b91c1c" };
const msgSuccess = { ...msgBase, backgroundColor: "#dcfce7", color: "#166534" };

const labelStyle = { fontSize: 13, marginBottom: 4, display: "block" };
const inputStyle = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 10,
  border: "1px solid #4b5563",
  backgroundColor: "#020617",
  color: "#f9fafb",
  fontSize: 14,
  outline: "none",
};

const otpRow = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
};

const otpInputStyle = { ...inputStyle, flex: 1 };
const smallBtn = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid #4b5563",
  backgroundColor: "transparent",
  color: "#e5e7eb",
  fontSize: 12,
  cursor: "pointer",
};

const buttonStyle = {
  width: "100%",
  padding: "10px 12px",
  marginTop: 6,
  borderRadius: 999,
  border: "none",
  backgroundImage: "linear-gradient(90deg,#22c55e,#4ade80)",
  color: "#0f172a",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
};

const footerStyle = {
  marginTop: 8,
  textAlign: "center",
  fontSize: 13,
  color: "#e5e7eb",
};

const linkStyle = {
  color: "#fb923c",
  textDecoration: "none",
  fontWeight: 500,
};

// point directly to /api
const API_BASE = "http://localhost:5000/api";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");

  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const navigate = useNavigate();

  const setMessage = (text, isErr = false) => {
    setMsg(text);
    setIsError(isErr);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setEmailVerified(false);
    setEmailOtp("");
    setVerificationToken("");
  };

  // PHONE: only digits, max 10
  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/D/g, "").slice(0, 10);
    setPhone(digitsOnly);
  };

  // SEND OTP using /api/auth/send-otp
  const handleSendEmailOtp = async () => {
    if (!email) {
      setMessage("Enter email first.", true);
      return;
    }

    try {
      setMessage("");
      setOtpLoading(true);

      const res = await axios.post(`${API_BASE}/auth/send-otp`, { email });

      setEmailVerified(false);
      setVerificationToken("");
      setMessage(
        res.data.message ||
          "OTP sent to your email. Please check inbox/spam.",
        false
      );
    } catch (err) {
      console.error("send email otp error", err.response?.data || err.message);
      setMessage(
        err.response?.data?.message || "Failed to send OTP",
        true
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // still uses /api/verify/confirm-email (keep as is unless backend changed)
  const handleConfirmEmailOtp = async () => {
    if (!emailOtp) {
      setMessage("Enter the OTP from your email.", true);
      return;
    }

    try {
      setMessage("");
      setOtpLoading(true);

      const res = await axios.post(`${API_BASE}/verify/confirm-email`, {
        email,
        otp: emailOtp,
      });

      const tokenFromServer = res.data.verification_token;
      if (!tokenFromServer) {
        console.warn("No verification_token in response:", res.data);
      }

      setVerificationToken(tokenFromServer || "");
      setEmailVerified(true);
      setEmailOtp("");
      setMessage(res.data.message || "Email verified", false);
    } catch (err) {
      console.error(
        "confirm email otp error",
        err.response?.data || err.message
      );
      setEmailVerified(false);
      setVerificationToken("");
      setMessage(
        err.response?.data?.message || "Failed to verify OTP",
        true
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (!emailVerified || !verificationToken) {
      setMessage(
        "Please verify your email with OTP before signing up.",
        true
      );
      return;
    }

    if (phone.length !== 10) {
      setMessage("Phone number must be exactly 10 digits.", true);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/signup`, {
        name,
        email,
        phone,
        password,
        verification_token: verificationToken,
      });

      setMessage(res.data.message || "Signup successful", false);

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }
      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }

      setTimeout(() => navigate("/tournaments"), 500);
    } catch (err) {
      console.error("signup error", err.response?.data || err.message);
      setMessage(
        err.response?.data?.message || "Signup failed",
        true
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={overlayStyle} />
      <form style={cardStyle} onSubmit={handleSubmit}>
        <h2 style={titleStyle}>Sign Up</h2>
        <p style={subtitleStyle}>Create your Freefire tournament account.</p>

        {msg && <p style={isError ? msgError : msgSuccess}>{msg}</p>}

        <div>
          <label style={labelStyle}>Full name</label>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Copy Your Freefire Name & Paste Here"
          />
        </div>

        <div>
          <label style={labelStyle}>Email</label>
          <input
            style={inputStyle}
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="you@example.com"
            disabled={emailVerified}
          />
        </div>

        {!emailVerified && (
          <div>
            <label style={labelStyle}>Email OTP</label>
            <div style={otpRow}>
              <input
                style={otpInputStyle}
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value)}
                placeholder="Enter OTP from email"
              />
              <button
                type="button"
                style={smallBtn}
                disabled={!email || otpLoading}
                onClick={handleSendEmailOtp}
              >
                {otpLoading ? "..." : "Send"}
              </button>
              <button
                type="button"
                style={smallBtn}
                disabled={!emailOtp || otpLoading}
                onClick={handleConfirmEmailOtp}
              >
                Confirm
              </button>
            </div>
          </div>
        )}

        {emailVerified && (
          <p style={{ fontSize: 12, color: "#4ade80", marginTop: -4 }}>
            ✅ Email verified
          </p>
        )}

        <div>
          <label style={labelStyle}>Phone (10 digit)</label>
          <input
            style={inputStyle}
            value={phone}
            onChange={handlePhoneChange}
            placeholder="9876543210"
            maxLength={10}
          />
        </div>

        <div>
          <label style={labelStyle}>Password</label>
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" style={buttonStyle} disabled={loading}>
          {loading ? "Signing up..." : "Sign Up"}
        </button>

        <p style={footerStyle}>
          Already have an account?{" "}
          <Link to="/login" style={linkStyle}>
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}