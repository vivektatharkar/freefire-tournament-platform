// frontend/src/pages/AdminPanel.jsx
import React, { useEffect, useState } from "react";
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

const TEAM_SCORECARD_ROUTE = "/admin/leaderboard";
const SUPPORT_INBOX_ROUTE = "/admin/support";

/* KPI styles (ONE LINE) */
const kpiRow = {
  display: "flex",
  gap: 12,
  marginTop: 16,
  overflowX: "auto",
  overflowY: "hidden",
  paddingBottom: 8,

  // keep all in one line
  flexWrap: "nowrap",

  // smoother scroll on mobile
  WebkitOverflowScrolling: "touch",

  // optional: avoid layout jump when scrollbar appears
  scrollbarGutter: "stable",
};

const kpiCard = {
  borderRadius: 16,
  padding: 14,
  border: "1px solid rgba(148,163,184,0.16)",
  background: "rgba(2,6,23,0.55)",
  boxShadow: "0 12px 40px rgba(0,0,0,0.25)",

  // fixed width so they stay as cards in a row
  minWidth: 220,
  flex: "0 0 220px",
};

const kpiLabel = { fontSize: 12, opacity: 0.8, marginBottom: 6 };
const kpiValue = { fontSize: 18, fontWeight: 800 };
const kpiMini = {
  fontSize: 12,
  opacity: 0.75,
  marginTop: 6,
  lineHeight: 1.35,
};

function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function valOrDash(v) {
  return v === null || v === undefined ? "-" : v;
}

function safeLower(v) {
  return (v ?? "").toString().trim().toLowerCase();
}

export default function AdminPanel() {
  const storedUser = localStorage.getItem("user");
  const token = localStorage.getItem("token") || "";
  const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

  let adminName = "Admin";
  let myEmail = "";

  try {
    if (storedUser) {
      const u = JSON.parse(storedUser);
      if (u?.name) adminName = u.name;
      if (u?.email) myEmail = u.email;
    }
  } catch {}

  // ✅ only you can see superadmin tools
  const isSuperAdmin = safeLower(myEmail) === "vivektatharkar@gmail.com";

  const [stats, setStats] = useState(null);
  const [statsErr, setStatsErr] = useState("");

  const pageStyle = {
    ...pageBase,
    backgroundImage: `linear-gradient(180deg, rgba(7,16,29,0.4), rgba(4,6,14,0.96)), url(${bg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  async function readApiError(res) {
    const txt = await res.text().catch(() => "");
    try {
      const j = txt ? JSON.parse(txt) : {};
      return j?.message || `Request failed (${res.status})`;
    } catch {
      return txt || `Request failed (${res.status})`;
    }
  }

  async function loadStats() {
    setStatsErr("");

    if (!token) {
      setStats(null);
      return;
    }

    try {
      const res = await fetch(`${API}/api/admin/dashboard/stats`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(await readApiError(res));

      const data = await res.json().catch(() => null);
      setStats(data || null);
    } catch (e) {
      setStats(null);
      setStatsErr(e?.message || "Failed to load dashboard stats");
    }
  }

  useEffect(() => {
    loadStats();
    const t = setInterval(loadStats, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const prizeAmtTotal = stats?.prize_paid_total;
  const prizeAmtToday = stats?.prize_paid_today;
  const prizeAmtWeek = stats?.prize_paid_week;
  const prizeAmtMonth = stats?.prize_paid_month;

  const prizeCntTotal = stats?.prize_paid_count_total;
  const prizeCntToday = stats?.prize_paid_count_today;
  const prizeCntWeek = stats?.prize_paid_count_week;
  const prizeCntMonth = stats?.prize_paid_count_month;

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

        {/* KPI row (ONE LINE with horizontal scroll) */}
        <div style={kpiRow}>
          <div style={kpiCard}>
            <div style={kpiLabel}>Users</div>
            <div style={kpiValue}>{stats ? stats.total_users : "-"}</div>
            <div style={kpiMini}>
              Today: {stats ? stats.new_users_today : "-"} <br />
              Week: {stats ? stats.new_users_week : "-"} <br />
              Month: {stats ? stats.new_users_month : "-"}
            </div>
          </div>

          <div style={kpiCard}>
            <div style={kpiLabel}>Online users (last 5 min)</div>
            <div style={kpiValue}>{stats ? stats.online_users : "-"}</div>
          </div>

          <div style={kpiCard}>
            <div style={kpiLabel}>Credits</div>
            <div style={kpiValue}>
              ₹ {stats ? fmtMoney(stats.credits_total) : "-"}
            </div>
            <div style={kpiMini}>
              Today: ₹ {stats ? fmtMoney(stats.credits_today) : "-"} <br />
              Week: ₹ {stats ? fmtMoney(stats.credits_week) : "-"} <br />
              Month: ₹ {stats ? fmtMoney(stats.credits_month) : "-"}
            </div>
          </div>

          <div style={kpiCard}>
            <div style={kpiLabel}>Prize distribution</div>
            <div style={kpiValue}>
              ₹ {stats ? fmtMoney(prizeAmtTotal) : "-"}
            </div>
            <div style={kpiMini}>
              Today: ₹ {stats ? fmtMoney(prizeAmtToday) : "-"} (
              {stats ? valOrDash(prizeCntToday) : "-"} payouts) <br />
              Week: ₹ {stats ? fmtMoney(prizeAmtWeek) : "-"} (
              {stats ? valOrDash(prizeCntWeek) : "-"} payouts) <br />
              Month: ₹ {stats ? fmtMoney(prizeAmtMonth) : "-"} (
              {stats ? valOrDash(prizeCntMonth) : "-"} payouts) <br />
              Total payouts: {stats ? valOrDash(prizeCntTotal) : "-"}
            </div>
          </div>

          <div style={kpiCard}>
            <div style={kpiLabel}>Withdrawal pending</div>
            <div style={kpiValue}>
              ₹ {stats ? fmtMoney(stats.withdrawal_pending_amount_total) : "-"}
            </div>
            <div style={kpiMini}>
              Requests: {stats ? stats.withdrawal_pending_count : "-"} <br />
              Today: ₹{" "}
              {stats ? fmtMoney(stats.withdrawal_pending_amount_today) : "-"}{" "}
              <br />
              Week: ₹{" "}
              {stats ? fmtMoney(stats.withdrawal_pending_amount_week) : "-"}{" "}
              <br />
              Month: ₹{" "}
              {stats ? fmtMoney(stats.withdrawal_pending_amount_month) : "-"}
            </div>
          </div>

          <div style={kpiCard}>
            <div style={kpiLabel}>Matches joined</div>
            <div style={kpiValue}>{stats ? stats.joined_total : "-"}</div>
            <div style={kpiMini}>
              Today: {stats ? valOrDash(stats.joined_today) : "-"} <br />
              Week: {stats ? valOrDash(stats.joined_week) : "-"} <br />
              Month: {stats ? valOrDash(stats.joined_month) : "-"}
            </div>
          </div>
        </div>

        {statsErr ? (
          <div style={{ marginTop: 12, fontSize: 13, color: "#fecaca" }}>
            {statsErr}
          </div>
        ) : null}

        <div style={cardsGrid}>
          <div style={card}>
            <div>
              <div style={cardTitle}>Battle Royale (Single Match)</div>
              <div style={cardText}>
                View and manage BR tournaments. Players can join and play classic
                single-map Battle Royale.
              </div>
            </div>
            <Link to="/admin/tournaments/br" style={cardButton}>
              Open BR Tournaments
            </Link>
          </div>

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

          <div style={card}>
            <div>
              <div style={cardTitle}>Scores</div>
              <div style={cardText}>
                Update player scores (BR/B2B/CS/Headshot) and B2B team scores.
              </div>
            </div>
            <Link to="/admin/scores" style={cardButton}>
              Open Scores
            </Link>
          </div>

          <div style={card}>
            <div>
              <div style={cardTitle}>Team Scorecard</div>
              <div style={cardText}>
                View and finalize team leaderboard entries (rank/score) for each
                match type using saved team score records.
              </div>
            </div>
            <Link to={TEAM_SCORECARD_ROUTE} style={cardButton}>
              Open Team Scorecard
            </Link>
          </div>

          <div style={card}>
            <div>
              <div style={cardTitle}>Support Inbox</div>
              <div style={cardText}>
                View user support tickets, reply to users, and close/resolve
                issues directly from the admin inbox.
              </div>
            </div>
            <Link to={SUPPORT_INBOX_ROUTE} style={cardButton}>
              Open Support Inbox
            </Link>
          </div>

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

          {isSuperAdmin ? (
            <div style={card}>
              <div>
                <div style={cardTitle}>SuperAdmin</div>
                <div style={cardText}>
                  Make/remove admins manually. Only visible for your superadmin
                  email.
                </div>
              </div>
              <Link to="/superadmin" style={cardButton}>
                Open SuperAdmin
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}