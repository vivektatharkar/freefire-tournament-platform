// src/components/Navbar.jsx
import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const barStyle = {
  height: 72,
  padding: "0 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background:
    "linear-gradient(90deg, rgba(15,23,42,0.97), rgba(30,64,175,0.9))",
  color: "#f9fafb",
  fontFamily:
    "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  boxShadow: "0 8px 25px rgba(0,0,0,0.65)",
  position: "relative",
  zIndex: 40,
};

const leftRow = { display: "flex", alignItems: "center", gap: 12 };
const logoBlock = { display: "flex", flexDirection: "column", gap: 2 };
const logoText = { fontSize: 18, fontWeight: 700, letterSpacing: 0.4 };
const subtitle = { fontSize: 11, color: "#cbd5f5" };

const menuButton = {
  width: 34,
  height: 34,
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.7)",
  background:
    "radial-gradient(circle at 0% 0%, rgba(248,250,252,0.16), rgba(15,23,42,1))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 5px 12px rgba(0,0,0,0.5)",
};
const dot = {
  width: 3,
  height: 3,
  borderRadius: 999,
  background: "#e5e7eb",
  margin: "2px 0",
};

const walletPill = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 14px",
  borderRadius: 999,
  background:
    "linear-gradient(90deg, rgba(15,23,42,0.95), rgba(5,150,105,0.9))",
  border: "1px solid rgba(22,163,74,0.9)",
  boxShadow: "0 6px 16px rgba(4,120,87,0.55)",
  fontSize: 13,
};
const walletAmountStyle = { fontWeight: 600, fontSize: 14 };
const walletLabel = { fontSize: 11, opacity: 0.9 };

const walletAddBtn = {
  padding: "4px 10px",
  borderRadius: 999,
  border: "none",
  fontSize: 11,
  fontWeight: 600,
  background: "rgba(248,250,252,0.96)",
  color: "#065f46",
  cursor: "pointer",
};

const overlayStyle = (open) => ({
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.65)",
  backdropFilter: "blur(3px)",
  opacity: open ? 1 : 0,
  pointerEvents: open ? "auto" : "none",
  transition: "opacity .18s ease",
  zIndex: 35,
});

const drawerStyle = (open) => ({
  position: "fixed",
  top: 0,
  left: 0,
  height: "100vh",
  width: 260,
  background: "#020617",
  boxShadow: "8px 0 40px rgba(0,0,0,0.9)",
  transform: open ? "translateX(0)" : "translateX(-100%)",
  transition: "transform .22s ease-out",
  padding: "18px 18px 22px",
  zIndex: 40,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  borderRight: "1px solid rgba(148,163,184,0.35)",
});

const drawerHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
};
const closeBtn = {
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.7)",
  background: "rgba(15,23,42,1)",
  color: "#e5e7eb",
  fontSize: 18,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const menuList = {
  marginTop: 6,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  height: "100%",
};
const menuItem = (danger = false) => ({
  padding: "10px 12px",
  borderRadius: 12,
  cursor: "pointer",
  fontSize: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: danger
    ? "linear-gradient(90deg, rgba(248,113,113,0.16), rgba(127,29,29,0.4))"
    : "linear-gradient(90deg, rgba(15,23,42,0.96), rgba(15,23,42,0.9))",
  border: danger
    ? "1px solid rgba(248,113,113,0.8)"
    : "1px solid rgba(31,41,55,1)",
  color: danger ? "#fecaca" : "#e5e7eb",
  boxShadow: danger
    ? "0 6px 14px rgba(185,28,28,0.45)"
    : "0 4px 12px rgba(15,23,42,0.7)",
});
const menuHint = { fontSize: 11, color: "#9ca3af", marginTop: 12 };

const adminEmails = ["vivektatharkar@gmail.com"];

export default function Navbar() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext); // may be undefined briefly

  const user = auth?.user || null;
  const ctxLogout = auth?.logout || (() => {});

  const [open, setOpen] = useState(false);
  const [wallet, setWallet] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setWallet(0);
      setIsAdmin(false);
      return;
    }

    const raw =
      user.wallet_balance !== undefined ? user.wallet_balance : user.wallet || 0;
    const val = Number(raw);
    setWallet(Number.isNaN(val) ? 0 : val);

    const role = (user.role || "").toString().toLowerCase();
    const email = (user.email || "").toString().toLowerCase();
    setIsAdmin(role === "admin" || adminEmails.includes(email));
  }, [user]);

  const formatMoney = (amount) =>
    `₹${amount.toFixed(2)}`.replace(/B(?=(d{3})+(?!d))/g, ",");

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const logout = () => {
    ctxLogout();
    setOpen(false);
    navigate("/login");
  };

   // inside Navbar component

   const handleHelp = () => {
   setOpen(false);
   navigate("/help-center");
  };

  const handleAddBalance = () => {
    navigate("/add-balance");
  };

  return (
    <>
      <header style={barStyle}>
        <div style={leftRow}>
          <button
            type="button"
            style={menuButton}
            onClick={() => setOpen(true)}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={dot} />
              <div style={dot} />
              <div style={dot} />
            </div>
          </button>

          <div style={logoBlock}>
            <div style={logoText}>Freefire Tournament Platform</div>
            <div style={subtitle}>Compete, win and track your games</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* 🔔 Notification bell visible on all protected pages */}
          <NotificationBell />

        

          <div style={walletPill}>
            <div>
              <div style={walletLabel}>Wallet balance</div>
              <div style={walletAmountStyle}>{formatMoney(wallet)}</div>
            </div>
            <button
              type="button"
              style={walletAddBtn}
              onClick={handleAddBalance}
            >
              Add
            </button>
          </div>
        </div>
      </header>

      <div style={overlayStyle(open)} onClick={() => setOpen(false)} />

      <aside style={drawerStyle(open)}>
        <div style={drawerHeader}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Menu</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Quick options</div>
          </div>
          <button
            type="button"
            style={closeBtn}
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <div style={menuList}>
          {isAdmin && (
            <div style={menuItem()} onClick={() => go("/admin")}>
              <span>Admin Panel</span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>
                Manage matches & users
              </span>
            </div>
          )}

          <div style={menuItem()} onClick={() => go("/history")}>
            <span>History</span>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              Joined tournaments
            </span>
          </div>

          <div style={menuItem()} onClick={() => go("/profile")}>
            <span>Profile</span>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>View / edit</span>
          </div>

          <div style={menuItem()} onClick={handleHelp}>
            <span>Help center</span>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Coming soon</span>
          </div>

          <div style={{ flex: 1 }} />

          <div style={menuItem(true)} onClick={logout}>
            <span>Logout</span>
          </div>
        </div>

        <div style={menuHint}>
          Use this menu to move between History and your Profile. Tournament
          cards and match types are available from the Home page.
        </div>
      </aside>
    </>
  );
}