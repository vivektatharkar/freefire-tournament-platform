// frontend/src/pages/TournamentsHistory.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";

/* ---------- Date helpers ---------- */
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

/* ================= STYLES ================= */

const pageBase = {
  minHeight: "100vh",
  padding: "40px 24px",
  boxSizing: "border-box",
  color: "#e6eef8",
  fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial",
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
  gap: 16,
};

const left = { display: "flex", flexDirection: "column", gap: 4 };
const title = { fontSize: 18, fontWeight: 700, margin: 0 };
const meta = { fontSize: 13, color: "rgba(230,238,248,0.85)" };

const badgeBase = {
  fontSize: 11,
  padding: "4px 10px",
  borderRadius: 999,
  fontWeight: 600,
  whiteSpace: "nowrap",
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

const badgeMode = {
  ...badgeBase,
  backgroundColor: "rgba(59,130,246,0.14)",
  color: "#bfdbfe",
};

const badgeType = {
  ...badgeBase,
  backgroundColor: "rgba(234,179,8,0.12)",
  color: "#fde68a",
};

const rowWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 6,
  alignItems: "center",
};

const detailsBox = {
  marginTop: 12,
  background: "linear-gradient(180deg, rgba(8,12,20,0.55), rgba(12,18,28,0.85))",
  borderRadius: 16,
  padding: 14,
  border: "1px solid rgba(148,163,184,0.15)",
};

const table = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  overflow: "hidden",
  borderRadius: 12,
};

const th = {
  textAlign: "left",
  fontSize: 12,
  padding: "10px 10px",
  color: "rgba(226,232,240,0.9)",
  background: "rgba(15,23,42,0.9)",
  borderBottom: "1px solid rgba(148,163,184,0.2)",
};

const td = {
  fontSize: 13,
  padding: "10px 10px",
  color: "rgba(226,232,240,0.95)",
  background: "rgba(15,23,42,0.55)",
  borderBottom: "1px solid rgba(148,163,184,0.12)",
};

const smallNote = { fontSize: 12, color: "rgba(209,213,219,0.85)" };

const actionBtn = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(15,23,42,0.85)",
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
  zIndex: 9999,
};

const modalBox = {
  width: "min(1100px, 100%)",
  maxHeight: "85vh",
  overflow: "auto",
  background: "linear-gradient(180deg, rgba(14,24,38,0.98), rgba(9,14,24,0.98))",
  borderRadius: 18,
  border: "1px solid rgba(148,163,184,0.18)",
  boxShadow: "0 16px 40px rgba(0,0,0,0.75)",
  padding: 16,
};

function normalizeMode(modeRaw) {
  const m = String(modeRaw || "").toLowerCase();
  if (m === "duo") return "Duo";
  if (m === "squad") return "Squad";
  return "Solo";
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getHistoryEndpoint(matchType) {
  if (matchType === "tournament") return "http://localhost:5000/api/tournaments/history/my";
  if (matchType === "b2b") return "http://localhost:5000/api/b2b/history/my";
  if (matchType === "cs") return "http://localhost:5000/api/cs/history/my";
  if (matchType === "headshot") return "http://localhost:5000/api/headshot/history/my";
  return null;
}

function getLeaderboardEndpoint(matchType, id) {
  if (matchType === "tournament")
    return `http://localhost:5000/api/tournaments/${id}/leaderboard`;
  if (matchType === "b2b") return `http://localhost:5000/api/b2b/${id}/leaderboard`;
  if (matchType === "cs") return `http://localhost:5000/api/cs/${id}/leaderboard`;
  if (matchType === "headshot") return `http://localhost:5000/api/headshot/${id}/leaderboard`;
  return null;
}

/* ================= COMPONENT ================= */

export default function TournamentHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState(null);

  // leaderboard modal (generic)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardErr, setLeaderboardErr] = useState("");
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [leaderboardMeta, setLeaderboardMeta] = useState({ match_type: "", title: "" });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErr("");

        const headers = getAuthHeaders();
        let all = [];

        // BR history
        try {
          const res = await axios.get(getHistoryEndpoint("tournament"), { headers });
          const rows = Array.isArray(res.data?.history) ? res.data.history : [];
          all.push(
            ...rows.map((x) => ({
              match_type: "tournament",
              id: x.tournament_id,
              name: x.name,
              date: x.date,
              mode: x.mode,
              entry_fee: x.entry_fee,
              price_pool: x.price_pool,
              status: x.status,
              match_status: x.match_status || null,
              score: x.score || 0,
              table: x.table || null,
            }))
          );
        } catch (e) {
          console.warn("BR history skipped");
        }

        // B2B history
        try {
          const res = await axios.get(getHistoryEndpoint("b2b"), { headers });
          const rows = Array.isArray(res.data?.history) ? res.data.history : [];
          all.push(
            ...rows.map((x) => ({
              match_type: "b2b",
              id: x.b2b_id,
              name: x.name,
              date: x.date,
              mode: x.mode,
              entry_fee: x.entry_fee,
              price_pool: x.price_pool,
              status: x.status,
              match_status: x.match_status || null,
              score: x.score || 0,
              table: x.table || null,
            }))
          );
        } catch (e) {
          console.warn("B2B history skipped");
        }

        // CS history
        try {
          const res = await axios.get(getHistoryEndpoint("cs"), { headers });
          const rows = Array.isArray(res.data?.history) ? res.data.history : [];
          all.push(
            ...rows.map((x) => ({
              match_type: "cs",
              id: x.cs_id,
              name: x.name,
              date: x.date,
              mode: x.mode,
              entry_fee: x.entry_fee,
              price_pool: x.price_pool,
              status: x.status,
              match_status: x.match_status || null,
              score: x.score || 0,
              team_side: x.team_side || null,
              is_team_leader: !!x.is_team_leader,
              table: x.table || null,
            }))
          );
        } catch (e) {
          console.warn("CS history skipped");
        }

        // Headshot history
        try {
          const res = await axios.get(getHistoryEndpoint("headshot"), { headers });
          const rows = Array.isArray(res.data?.history) ? res.data.history : [];
          all.push(
            ...rows.map((x) => ({
              match_type: "headshot",
              id: x.headshot_id,
              name: x.name,
              date: x.date,
              mode: x.mode,
              entry_fee: x.entry_fee,
              price_pool: x.price_pool,
              status: x.status,
              match_status: x.match_status || null,
              score: x.score || 0,
              team_side: x.team_side || null,
              is_team_leader: !!x.is_team_leader,
              table: x.table || null,
            }))
          );
        } catch (e) {
          console.warn("Headshot history skipped");
        }

        const now = new Date();
        const final = all
          .map((m) => {
            const dt = parseMatchDate(m.date);
            return { ...m, _isUpcoming: dt && dt >= now, _dt: dt };
          })
          .sort((a, b) => (b._dt || 0) - (a._dt || 0));

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

  const toggleOpen = (key) => setOpenId((p) => (p === key ? null : key));

  const openLeaderboard = async (matchType, matchId, titleForModal) => {
    const headers = getAuthHeaders();
    const url = getLeaderboardEndpoint(matchType, matchId);

    setLeaderboardMeta({ match_type: matchType, title: titleForModal || "Leaderboard" });
    setLeaderboardOpen(true);
    setLeaderboardLoading(true);
    setLeaderboardErr("");
    setLeaderboardData(null);

    try {
      const res = await axios.get(url, { headers });
      setLeaderboardData(res.data || null);
    } catch (e) {
      setLeaderboardErr("Failed to load leaderboard");
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const renderMyScoreTable = (row) => {
    const tablePayload = row.table;

    if (!tablePayload) {
      return <div style={smallNote}>No score/table data available for this match.</div>;
    }

    // SOLO-style table payload
    if (tablePayload.type === "solo") {
      const r0 = Array.isArray(tablePayload.rows) ? tablePayload.rows[0] : null;
      return (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Player Name</th>
              <th style={th}>Score</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={td}>{r0?.player_name || "You"}</td>
              <td style={td}>{safeNum(r0?.score, 0)}</td>
            </tr>
          </tbody>
        </table>
      );
    }

    // DUO / SQUAD payload (BR/B2B team table)
    const modeLabel = normalizeMode(row.mode);
    const players = Array.isArray(tablePayload.players) ? tablePayload.players : [];
    const teamName = tablePayload.team_name || "";
    const teamScore = safeNum(tablePayload.team_score, 0);

    const slots = modeLabel === "Duo" ? 2 : 4;
    const slotPlayers = Array.from({ length: slots }, (_, i) => {
      const p = players.find((x) => Number(x.slot_no) === i + 1) || null;
      return p;
    });

    return (
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Team Name</th>
            {slotPlayers.map((_, idx) => (
              <th key={idx} style={th}>
                Player {idx + 1}
              </th>
            ))}
            <th style={th}>Team Score</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={td}>{teamName || "—"}</td>
            {slotPlayers.map((p, idx) => (
              <td key={idx} style={td}>
                <div style={{ fontWeight: 600 }}>{p?.username || "—"}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>ID: {p?.player_game_id || "—"}</div>
              </td>
            ))}
            <td style={td}>{teamScore}</td>
          </tr>
        </tbody>
      </table>
    );
  };

  const renderLeaderboardModal = () => {
    if (!leaderboardOpen) return null;

    const close = () => {
      setLeaderboardOpen(false);
      setLeaderboardData(null);
      setLeaderboardErr("");
      setLeaderboardMeta({ match_type: "", title: "" });
    };

    const titleText = leaderboardMeta.title || "Leaderboard";

    // Title source can be tournament or match depending on API
    const nameText =
      leaderboardData?.tournament?.name ||
      leaderboardData?.match?.name ||
      "";

    const type = leaderboardData?.type;

    return (
      <div style={modalOverlay} onClick={close}>
        <div style={modalBox} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{titleText}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{nameText}</div>
            </div>

            <button style={actionBtn} onClick={close}>
              Close
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            {leaderboardLoading && <div>Loading…</div>}
            {leaderboardErr && <div style={{ color: "#fecaca" }}>{leaderboardErr}</div>}

            {!leaderboardLoading && !leaderboardErr && !leaderboardData && (
              <div style={smallNote}>No leaderboard data.</div>
            )}

            {/* BR/B2B SOLO */}
            {!leaderboardLoading && !leaderboardErr && type === "solo" && (
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Rank</th>
                    <th style={th}>Player Name</th>
                    <th style={th}>Game ID</th>
                    <th style={th}>Score</th>
                    <th style={th}>Match Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(leaderboardData.rows || []).map((r) => (
                    <tr key={`${r.user_id}-${r.rank}`}>
                      <td style={td}>{r.rank}</td>
                      <td style={td}>{r.name}</td>
                      <td style={td}>{r.game_id || "—"}</td>
                      <td style={td}>{safeNum(r.score, 0)}</td>
                      <td style={td}>{r.match_status || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* BR/B2B DUO/SQUAD */}
            {!leaderboardLoading &&
              !leaderboardErr &&
              (type === "duo" || type === "squad") && (
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Rank</th>
                      <th style={th}>Group</th>
                      <th style={th}>Team Name</th>
                      <th style={th}>Players</th>
                      <th style={th}>Team Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(leaderboardData.teams || []).map((t) => (
                      <tr key={t.team_id}>
                        <td style={td}>{t.rank}</td>
                        <td style={td}>{t.group_no}</td>
                        <td style={td}>{t.team_name || "—"}</td>
                        <td style={td}>
                          {(t.players || []).length === 0 ? (
                            "—"
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {(t.players || []).map((p) => (
                                <div key={`${t.team_id}-${p.slot_no}`}>
                                  <div style={{ fontWeight: 700 }}>
                                    {p.slot_no}. {p.username || "—"}
                                  </div>
                                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                                    ID: {p.player_game_id || "—"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={td}>{safeNum(t.team_score, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            {/* CS / Headshot */}
            {!leaderboardLoading &&
              !leaderboardErr &&
              (type === "cs" || type === "headshot") && (
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Rank</th>
                      <th style={th}>Player Name</th>
                      <th style={th}>Game ID</th>
                      <th style={th}>Team Side</th>
                      <th style={th}>Leader</th>
                      <th style={th}>Score</th>
                      <th style={th}>Match Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(leaderboardData.rows || []).map((r) => (
                      <tr key={`${r.user_id}-${r.rank}`}>
                        <td style={td}>{r.rank}</td>
                        <td style={td}>{r.name}</td>
                        <td style={td}>{r.game_id || "—"}</td>
                        <td style={td}>{r.team_side || "—"}</td>
                        <td style={td}>{r.is_team_leader ? "Yes" : "No"}</td>
                        <td style={td}>{safeNum(r.score, 0)}</td>
                        <td style={td}>{r.match_status || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </div>
      </div>
    );
  };

  const showBadges = (t) => {
    const type = t.match_type;

    // BR/B2B show prize/entry/status
    if (type === "tournament" || type === "b2b") {
      const modeLabel = normalizeMode(t.mode);
      return (
        <div style={rowWrap}>
          <span style={badgeMode}>Mode: {modeLabel}</span>
          <span style={badgeType}>Prize: ₹{safeNum(t.price_pool, 0)}</span>
          <span style={badgeType}>Entry: ₹{safeNum(t.entry_fee, 0)}</span>
          <span style={badgeType}>My Score: {safeNum(t.score, 0)}</span>
          {t.status && <span style={badgeType}>Status: {t.status}</span>}
        </div>
      );
    }

    // CS/Headshot show score and side
    if (type === "cs" || type === "headshot") {
      return (
        <div style={rowWrap}>
          <span style={badgeType}>My Score: {safeNum(t.score, 0)}</span>
          {t.team_side && <span style={badgeType}>Side: {t.team_side}</span>}
          {t.is_team_leader && <span style={badgeType}>Leader</span>}
          {t.match_status && <span style={badgeType}>Status: {t.match_status}</span>}
        </div>
      );
    }

    return null;
  };

  return (
    <div style={pageStyle}>
      {renderLeaderboardModal()}

      <div style={container}>
        <div style={backRow}>
          <button style={backBtn} onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>

        <div style={header}>
          <h1 style={{ fontSize: 32, margin: 0 }}>Tournament history</h1>
        </div>

        {loading && <div>Loading…</div>}
        {err && <div style={{ color: "#fecaca" }}>{err}</div>}

        {!loading && !err && history.length === 0 && (
          <div style={smallNote}>No joined matches found.</div>
        )}

        {!loading &&
          !err &&
          history.map((t) => {
            const key = `${t.match_type}-${t.id}`;
            const isOpen = openId === key;

            const typeLabel =
              t.match_type === "cs"
                ? "CS Match"
                : t.match_type === "headshot"
                ? "Headshot CS Match"
                : t.match_type === "b2b"
                ? "B2B Match"
                : "Tournament (BR) Match";

            return (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={card}>
                  <div style={left}>
                    <h3 style={title}>{typeLabel}</h3>
                    <div style={meta}>{t.name}</div>
                    <div style={meta}>Match time: {formatDateLabel(t.date)}</div>
                    {showBadges(t)}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
                    <span style={t._isUpcoming ? badgeUpcoming : badgeCompleted}>
                      {t._isUpcoming ? "Upcoming match" : "Completed match"}
                    </span>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button onClick={() => toggleOpen(key)} style={actionBtn}>
                        {isOpen ? "Hide table" : "View my table"}
                      </button>

                      <button
                        onClick={() => openLeaderboard(t.match_type, t.id, `${typeLabel} Leaderboard`)}
                        style={actionBtn}
                      >
                        Leaderboard
                      </button>
                    </div>
                  </div>
                </div>

                {isOpen && <div style={detailsBox}>{renderMyScoreTable(t)}</div>}
              </div>
            );
          })}
      </div>
    </div>
  );
}