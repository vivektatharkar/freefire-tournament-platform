// frontend/src/pages/auth/Login.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import bg from "../../assets/bg.jpg";

const API_BASE = "http://localhost:5000";

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
    "radial-gradient(circle at top, rgba(15,23,42,0.6), rgba(15,23,42,0.92))",
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
  marginBottom: 14,
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

const buttonPrimary = {
  width: "100%",
  padding: "10px 12px",
  marginTop: 6,
  borderRadius: 999,
  border: "none",
  backgroundImage: "linear-gradient(90deg,#facc15,#fb923c)",
  color: "#0f172a",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
};

const buttonSecondary = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 999,
  border: "1px solid #4b5563",
  backgroundColor: "transparent",
  color: "#e5e7eb",
  fontSize: 13,
  cursor: "pointer",
};

const footerStyle = {
  marginTop: 4,
  textAlign: "center",
  fontSize: 13,
  color: "#e5e7eb",
};

const linkStyle = {
  color: "#38bdf8",
  textDecoration: "none",
  fontWeight: 500,
};

const separatorStyle = {
  marginTop: 10,
  marginBottom: 10,
  borderTop: "1px solid #1f2937",
};

const smallLabel = {
  fontSize: 12,
  color: "#9ca3af",
  marginBottom: 4,
};

const smallButton = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "none",
  backgroundImage: "linear-gradient(90deg,#22c55e,#4ade80)",
  color: "#0f172a",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // forgot password
  const [showForgot, setShowForgot] = useState(false);
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const navigate = useNavigate();

  const setMessage = (text, isErr = false) => {
    setMsg(text);
    setIsError(isErr);
  };

  /* ----------------------------- LOGIN ----------------------------- */
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        email,
        password,
      });

      setMessage(res.data.message || "Login successful", false);

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }

      let role = null;
      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        role = res.data.user.role;
      }

      // ✅ redirect based on role
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    } catch (err) {
      console.error("login error", err.response?.data || err.message);
      setMessage(
        err.response?.data?.message || "Login failed",
        true
      );
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------- FORGOT: SEND OTP ------------------------ */
  const handleSendResetOtp = async () => {
    try {
      setMessage("");
      setResetLoading(true);

      if (!email) {
        setMessage("Enter your email above first.", true);
        setResetLoading(false);
        return;
      }

      const res = await axios.post(`${API_BASE}/api/auth/forgot-start`, {
        email,
      });

      setMessage(
        res.data.message ||
          "Reset OTP sent to your email. Check inbox or backend console.",
        false
      );
    } catch (err) {
      console.error("forgot-start error", err.response?.data || err.message);
      setMessage(
        err.response?.data?.message || "Failed to send reset OTP",
        true
      );
    } finally {
      setResetLoading(false);
    }
  };

  /* --------------------- FORGOT: COMPLETE RESET -------------------- */
  const handleResetPassword = async () => {
    try {
      setMessage("");
      setResetLoading(true);

      if (!email || !resetOtp || !newPassword) {
        setMessage("Email, OTP and new password are required", true);
        setResetLoading(false);
        return;
      }

      const res = await axios.post(`${API_BASE}/api/auth/forgot-complete`, {
        email,
        code: resetOtp,
        newPassword,
      });

      setMessage(
        res.data.message ||
          "Password reset successful. You can now login with new password.",
        false
      );

      setShowForgot(false);
      setResetOtp("");
      setNewPassword("");
    } catch (err) {
      console.error("forgot-complete error", err.response?.data || err.message);
      setMessage(
        err.response?.data?.message || "Failed to reset password",
        true
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={overlayStyle} />
      <form style={cardStyle} onSubmit={handleLogin}>
        <h2 style={titleStyle}>Login</h2>
        <p style={subtitleStyle}>Welcome back! Enter your credentials.</p>

        {msg && <p style={isError ? msgError : msgSuccess}>{msg}</p>}

        <div>
          <label style={labelStyle}>Email</label>
          <input
            style={inputStyle}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
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

        <button type="submit" style={buttonPrimary} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p style={footerStyle}>
          Don&apos;t have an account?{" "}
          <Link to="/signup" style={linkStyle}>
            Sign Up
          </Link>
        </p>

        <button
          type="button"
          style={buttonSecondary}
          onClick={() => setShowForgot((v) => !v)}
        >
          {showForgot ? "Hide forgot password" : "Show forgot password"}
        </button>

        {showForgot && (
          <>
            <div style={separatorStyle} />

            <p style={smallLabel}>Reset your password with email OTP</p>

            <div style={{ marginBottom: 8 }}>
              <button
                type="button"
                style={smallButton}
                disabled={resetLoading}
                onClick={handleSendResetOtp}
              >
                {resetLoading ? "Sending..." : "Send OTP to your email"}
              </button>
            </div>

            <div>
              <label style={smallLabel}>Enter OTP</label>
              <input
                style={inputStyle}
                value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value)}
                placeholder="OTP from email"
              />
            </div>

            <div>
              <label style={smallLabel}>New password</label>
              <input
                style={inputStyle}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
              />
            </div>

            <button
              type="button"
              style={{
                ...buttonPrimary,
                backgroundImage: "linear-gradient(90deg,#22c55e,#4ade80)",
              }}
              disabled={resetLoading}
              onClick={handleResetPassword}
            >
              {resetLoading ? "Resetting..." : "Reset Password"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}