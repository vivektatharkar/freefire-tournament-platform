import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";

/* ================= SAME DATE HELPERS AS OTHER PAGES ================= */

function parseMatchDate(raw) {
  if (!raw) return null;

  const m = String(raw).match(
    /(\d{4})-(\d{2})-(\d{2}).*?(\d{2}):(\d{2})/
  );
  if (m) {
    const y = +m[1],
      mo = +m[2] - 1,
      d = +m[3],
      h = +m[4],
      mi = +m[5];
    const dt = new Date(y, mo, d, h, mi);
    if (!isNaN(dt.getTime())) return dt;
  }

  const dt2 = new Date(raw);
  if (!isNaN(dt2.getTime())) return dt2;

  return null;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(raw) {
  const dt = parseMatchDate(raw);
  if (!dt) return "Unknown time";

  const now = new Date();
  const isToday = isSameDay(dt, now);

  const timeStr = dt.toLocaleString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return `Today at ${timeStr}`;

  const dateStr = dt.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${dateStr} at ${timeStr}`;
}

/* ================= STYLES (UNCHANGED) ================= */

const pageBase = {
  minHeight: "100vh",
  padding: "40px 24px",
  boxSizing: "border-box",
  color: "#e6eef8",
  fontFamily:
    "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial",
};

const container = { maxWidth: 1200, margin: "0 auto" };

const backRow = { marginBottom: 14 };

const backBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.7)",
  background: "rgba(15,23,42,0.9)",
  color: "#e5e7eb",
  fontSize: 13,
  cursor: "pointer",
};

const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 24,
};

const card = {
  background: "linear-gradient(180deg, rgba(14,24,38,0.9), rgba(9,14,24,0.96))",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 14px 35px rgba(0,0,0,0.7)",
  marginBottom: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const left = { display: "flex", flexDirection: "column", gap: 4 };
const title = { fontSize: 18, fontWeight: 700, margin: 0 };
const meta = { fontSize: 13, color: "rgba(230,238,248,0.85)" };

const badgeBase = {
  fontSize: 11,
  padding: "4px 10px",
  borderRadius: 999,
  fontWeight: 600,
};

const badgeUpcoming = {
  ...badgeBase,
  backgroundColor: "rgba(34,197,94,0.12)",
  color: "#4ade80",
};

const badgeCompleted = {
  ...badgeBase,
  backgroundColor: "rgba(168,85,247,0.12)",
  color: "#c4b5fd",
};

/* ================= COMPONENT ================= */

export default function TournamentHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
  const load = async () => {
    try {
      setLoading(true);
      setErr("");

      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      let all = [];

      /* ---------- BR TOURNAMENTS ---------- */
      try {
        const tRes = await axios.get("http://localhost:5000/api/tournaments", { headers });
        const tJoined = await axios.get("http://localhost:5000/api/tournaments/joined/my", { headers });
        const tSet = new Set((tJoined.data || []).map(String));

        const tournaments = (tRes.data || [])
          .filter((t) => tSet.has(String(t.id)))
          .map((t) => ({
            ...t,
            match_type: "tournament",
          }));

        all.push(...tournaments);
      } catch (e) {
        console.warn("BR history skipped");
      }

      /* ---------- CS MATCHES ---------- */
      try {
        const csRes = await axios.get("http://localhost:5000/api/cs/tournaments", { headers });
        const csJoined = await axios.get("http://localhost:5000/api/cs/joined/my", { headers });
        const csSet = new Set((csJoined.data || []).map(String));

        const csMatches = (csRes.data || [])
          .filter((m) => csSet.has(String(m.id)))
          .map((m) => ({
            ...m,
            match_type: "cs",
          }));

        all.push(...csMatches);
      } catch (e) {
        console.warn("CS history skipped");
      }

      /* ---------- HEADSHOT MATCHES ---------- */
      try {
        const hRes = await axios.get("http://localhost:5000/api/headshot", { headers });
        const hJoined = await axios.get("http://localhost:5000/api/headshot/joined/my", { headers });
        const hSet = new Set((hJoined.data || []).map(String));

        const headshots = (hRes.data || [])
          .filter((m) => hSet.has(String(m.id)))
          .map((m) => ({
            ...m,
            match_type: "headshot",
          }));

        all.push(...headshots);
      } catch (e) {
        console.warn("Headshot history skipped");
      }

      /* ---------- B2B MATCHES ---------- */
       try {
       const b2bRes = await axios.get("http://localhost:5000/api/b2b", { headers });
       const b2bJoined = await axios.get("http://localhost:5000/api/b2b/joined/my", { headers });
       const b2bSet = new Set((b2bJoined.data || []).map(String));

       const b2bMatches = (b2bRes.data || [])
       .filter((m) => b2bSet.has(String(m.id)))
       .map((m) => ({
        ...m,
       match_type: "b2b",
       }));

       all.push(...b2bMatches);
       } catch (e) {
       console.warn("B2B history skipped");
      }
      const now = new Date();

      const final = all
        .map((m) => {
          const dt = parseMatchDate(m.date);
          return {
            ...m,
            _isUpcoming: dt && dt >= now,
            _dt: dt,
          };
        })
        .sort((a, b) => b._dt - a._dt);

      setHistory(final);
    } catch (e) {
      setErr("Failed to load tournament history");
    } finally {
      setLoading(false);
    }
  };

  load();
}, []);

  const pageStyle = {
    ...pageBase,
    backgroundImage: `linear-gradient(180deg, rgba(7,16,29,0.25), rgba(4,6,14,0.7)), url(${bg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  return (
    <div style={pageStyle}>
      <div style={container}>
        <div style={backRow}>
          <button style={backBtn} onClick={() => navigate(-1)}>← Back</button>
        </div>

        <div style={header}>
          <h1 style={{ fontSize: 32, margin: 0 }}>Tournament history</h1>
        </div>

        {loading && <div>Loading…</div>}
        {err && <div>{err}</div>}

        {history.map((t) => (
          <div key={`${t.match_type}-${t.id}`} style={card}>
            <div style={left}>
              <h3 style={title}>
                {t.match_type === "cs"
               ? "CS Match"
               : t.match_type === "headshot"
               ? "Headshot CS Match"
               : t.match_type === "b2b"
               ? "B2B Match"
               : "Tournament (BR) Match"}
              </h3>
              <div style={meta}>{t.name}</div>
              <div style={meta}>Match time: {formatDateLabel(t.date)}</div>
            </div>

            <span style={t._isUpcoming ? badgeUpcoming : badgeCompleted}>
              {t._isUpcoming ? "Upcoming match" : "Completed match"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}