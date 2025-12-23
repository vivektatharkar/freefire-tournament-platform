// frontend/src/pages/AdminPanel.jsx
import React from "react";
import { Link } from "react-router-dom";
import bg from "../assets/bg.jpg";

const pageBase = {
  minHeight: "100vh",
  padding: "40px 24px",
  boxSizing: "border-box",
  color: "#e6eef8",
  fontFamily:
    "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
};

const container = { maxWidth: 1200, margin: "0 auto" };

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
  marginTop: 24,
};

const card = {
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(15,23,42,0.98))",
  borderRadius: 20,
  padding: 18,
  boxShadow: "0 14px 30px rgba(0,0,0,0.6)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const cardTitle = { fontSize: 18, fontWeight: 700, marginBottom: 6 };
const cardText = {
  fontSize: 13,
  color: "rgba(209,213,219,0.9)",
  marginBottom: 12,
};

const cardButton = {
  alignSelf: "flex-start",
  padding: "8px 14px",
  borderRadius: 999,
  border: "none",
  backgroundImage: "linear-gradient(90deg,#38bdf8,#22c55e)",
  color: "#020617",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  textDecoration: "none",
};

const headerRow = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
};

const titleStyle = { fontSize: 30, fontWeight: 800, margin: 0 };
const subtitleStyle = {
  fontSize: 14,
  color: "rgba(148,163,184,0.95)",
  marginTop: 6,
};

export default function AdminPanel() {
  const storedUser = localStorage.getItem("user");
  let adminName = "Admin";

  try {
    if (storedUser) {
      const u = JSON.parse(storedUser);
      if (u?.name) adminName = u.name;
    }
  } catch {
    // ignore parse errors
  }

  const pageStyle = {
    ...pageBase,
    backgroundImage: `linear-gradient(180deg, rgba(7,16,29,0.4), rgba(4,6,14,0.96)), url(${bg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  return (
    <div style={pageStyle}>
      <div style={container}>
        <div style={headerRow}>
          <div>
            <h1 style={titleStyle}>Admin Panel</h1>
            <div style={subtitleStyle}>
              Welcome, <strong>{adminName}</strong>. Manage tournaments,
              withdrawals, wallet top‑ups and notifications here.
            </div>
          </div>
        </div>

        <div style={cardsGrid}>
          {/* BR admin page */}
          <div style={card}>
            <div>
              <div style={cardTitle}>Battle Royale (Single Match)</div>
              <div style={cardText}>
                View and manage BR tournaments. Players can join and play
                classic single-map Battle Royale.
              </div>
            </div>
            <Link to="/admin/tournaments/br" style={cardButton}>
              Open BR Tournaments
            </Link>
          </div>

          {/* B2B admin page */}
          <div style={card}>
            <div>
              <div style={cardTitle}>B2B – 3 BR Matches</div>
              <div style={cardText}>
                Manage back-to-back Battle Royale tournaments that run across
                three matches.
              </div>
            </div>
            <Link to="/admin/tournaments/b2b" style={cardButton}>
              Open B2B Tournaments
            </Link>
          </div>

          {/* CS admin page */}
          <div style={card}>
            <div>
              <div style={cardTitle}>Clash Squad (CS)</div>
              <div style={cardText}>
                Manage Clash Squad tournaments stored in the <code>csmatches</code>{" "}
                table.
              </div>
            </div>
            <Link to="/admin/tournaments/cs" style={cardButton}>
              Open CS Tournaments
            </Link>
          </div>

          {/* Headshot CS admin page */}
          <div style={card}>
            <div>
              <div style={cardTitle}>Headshot CS</div>
              <div style={cardText}>
                Manage headshot-only Clash Squad matches from the{" "}
                <code>headshot</code> table.
              </div>
            </div>
            <Link to="/admin/tournaments/headshot" style={cardButton}>
              Open Headshot CS
            </Link>
          </div>

          {/* Withdrawals admin page */}
          <div style={card}>
            <div>
              <div style={cardTitle}>Withdrawal Requests</div>
              <div style={cardText}>
                Review and approve or reject user withdrawal requests. Wallet is
                updated automatically and users get notifications.
              </div>
            </div>
            <Link to="/admin/withdrawals" style={cardButton}>
              Open Withdrawals
            </Link>
          </div>

          {/* NEW: Wallet top‑ups admin page */}
          <div style={card}>
            <div>
              <div style={cardTitle}>Wallet Top‑ups</div>
              <div style={cardText}>
                View all wallet top‑ups and export CSV for manual accounting and
                Razorpay reconciliation.
              </div>
            </div>
            <Link to="/admin/wallet-topups" style={cardButton}>
              Open Wallet Top‑ups
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}