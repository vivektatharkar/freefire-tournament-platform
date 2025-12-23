// src/pages/TournamentsHeadshot.js
import React, { useEffect, useRef, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import BackButton from "../components/BackButton";
import bg from "../assets/bg.jpg";
import thumbDefault from "../assets/thumb.jpg";

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

function formatMatchLabel(raw) {
  const dt = parseMatchDate(raw);
  if (!dt) return "TBD";
  const now = new Date();
  const today = isSameDay(dt, now);
  const timeStr = dt.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (today) return `Today at ${timeStr}`;
  const dateStr = dt.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${dateStr} at ${timeStr}`;
}

function isJoinClosed(rawDate, nowMs) {
  const dt = parseMatchDate(rawDate);
  if (!dt) return false;
  const diffMin = (dt.getTime() - nowMs) / 60000;
  return diffMin <= 5;
}

function isTournamentExpired(rawDate, nowMs) {
  const dt = parseMatchDate(rawDate);
  if (!dt) return false;
  const cutoff = dt.getTime() + 2 * 60 * 1000;
  return nowMs > cutoff;
}

/* ---------- styles ---------- */
const pageBase = {
  minHeight: "100vh",
  padding: "40px 24px",
  boxSizing: "border-box",
  color: "#e6eef8",
  fontFamily:
    "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
};

const container = { maxWidth: 1200, margin: "0 auto" };

const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 24,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 18,
  alignItems: "start",
};

const cardBase = {
  background:
    "linear-gradient(180deg, rgba(14,24,38,0.9), rgba(9,14,24,0.95))",
  borderRadius: 24,
  padding: 18,
  boxShadow: "0 12px 30px rgba(2,6,23,0.6)",
  overflow: "visible",
  minHeight: 140,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  transition: "transform .18s ease, box-shadow .18s ease",
  position: "relative",
};

const cardHover = {
  transform: "translateY(-6px)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
};

const thumbStyle = {
  width: 72,
  height: 72,
  borderRadius: 12,
  objectFit: "cover",
  marginRight: 12,
  flexShrink: 0,
  boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
};

const titleRow = { display: "flex", alignItems: "center" };

const titleStyle = { margin: 0, fontSize: 20, fontWeight: 800 };

const metaStyle = {
  marginTop: 6,
  fontSize: 13,
  color: "rgba(230,238,248,0.85)",
};

const buttonsRow = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  marginTop: 12,
  flexWrap: "wrap",
};

const btnPrimary = {
  background: "linear-gradient(90deg,#f97316,#fb923c)",
  border: "none",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
};

const btnJoined = {
  background: "#06d6a0",
  border: "none",
  color: "#042617",
  padding: "8px 14px",
  borderRadius: 999,
  cursor: "default",
  fontWeight: 700,
};

const btnSecondary = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#e6eef8",
  padding: "8px 12px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 500,
};

const btnConfirmYes = {
  background: "linear-gradient(90deg,#10b981,#34d399)",
  border: "none",
  color: "#042617",
  padding: "10px 16px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
};

const btnConfirmNo = {
  background: "transparent",
  border: "1px solid rgba(239,68,68,0.5)",
  color: "#fca5a5",
  padding: "10px 16px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
};

const infoPill = {
  background: "rgba(148,163,184,0.15)",
  borderRadius: 999,
  padding: "8px 14px",
  fontSize: 13,
  color: "#e5e7eb",
  marginTop: 12,
  display: "inline-flex",
  alignItems: "center",
};

const detailsBox = {
  marginTop: 14,
  background:
    "linear-gradient(180deg, rgba(8,12,20,0.7), rgba(12,18,28,0.9))",
  borderRadius: 16,
  padding: 16,
  color: "#e6eef8",
  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  animation: "detailsFade .18s ease",
};

const participantsPanel = {
  marginTop: 14,
  background:
    "linear-gradient(180deg, rgba(8,12,20,0.7), rgba(12,18,28,0.9))",
  borderRadius: 20,
  padding: 14,
  color: "#e6eef8",
  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  animation: "detailsFade .18s ease",
};

const participantsInner = {
  background: "rgba(15,23,42,0.9)",
  borderRadius: 16,
  padding: 10,
};

const badgeCount = {
  marginTop: 10,
  alignSelf: "flex-end",
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(148,163,184,0.16)",
  fontSize: 11,
  color: "#e5e7eb",
};

const participantRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 10,
  marginBottom: 6,
  background:
    "linear-gradient(90deg, rgba(30,64,175,0.30), rgba(15,23,42,0.7))",
  fontSize: 13,
};

const participantLeft = { display: "flex", flexDirection: "column" };

const smallCopyBtn = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "transparent",
  color: "#e6eef8",
  cursor: "pointer",
  fontSize: 12,
};

const teamColumns = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
  marginTop: 8,
};

const teamCard = {
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.9), rgba(15,23,42,0.98))",
  borderRadius: 12,
  padding: 8,
};

/* ---------- helpers ---------- */
function groupByTeam(participants) {
  const teamA = [];
  const teamB = [];
  const none = [];
  (participants || []).forEach((p) => {
    if (p.team_side === "A") teamA.push(p);
    else if (p.team_side === "B") teamB.push(p);
    else none.push(p);
  });
  return { teamA, teamB, none };
}

/* ---------- TeamBox component ---------- */
function TeamBox({ label, sideKey, list, isLeader, initialName, onSave }) {
  const [localName, setLocalName] = useState(initialName || "");

  useEffect(() => {
    setLocalName(initialName || "");
  }, [initialName]);

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={teamCard}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
        {isLeader && (
          <span
            style={{
              fontSize: 10,
              color: "rgba(96,165,250,0.95)",
            }}
          >
            Leader can edit
          </span>
        )}
      </div>

      {isLeader ? (
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 6,
          }}
        >
          <input
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            placeholder="Enter team name"
            style={{
              flex: 1,
              background: "rgba(15,23,42,0.9)",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.4)",
              color: "#e5e7eb",
              fontSize: 11,
              padding: "4px 8px",
              outline: "none",
            }}
          />
          <button
            type="button"
            style={smallCopyBtn}
            onClick={() => onSave(sideKey, localName)}
          >
            Save
          </button>
        </div>
      ) : (
        <div
          style={{
            fontSize: 12,
            marginBottom: 6,
            color: "rgba(229,231,235,0.9)",
          }}
        >
          {label}
        </div>
      )}

      {list.length === 0 ? (
        <div
          style={{
            fontSize: 12,
            color: "rgba(156,163,175,0.9)",
          }}
        >
          No players yet
        </div>
      ) : (
        list.map((p, idx) => (
          <div key={p.id || idx} style={participantRow}>
            <div style={participantLeft}>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  textTransform: "capitalize",
                }}
              >
                {p.name || "Unknown"}
                {p.is_me && " (You)"}
                {p.is_team_leader && " – Leader"}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(209,213,219,0.95)",
                }}
              >
                Freefire ID: {p.freefireId ? p.freefireId : "—"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(209,213,219,0.8)",
                }}
              >
                #{idx + 1}
              </span>
              {p.freefireId && (
                <button
                  type="button"
                  style={smallCopyBtn}
                  onClick={() => copyText(p.freefireId)}
                >
                  Copy ID
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ---------- main page ---------- */
export default function TournamentsHeadshot() {
  const { token, refreshUser } = useContext(AuthContext) || {};
  const [tournaments, setTournaments] = useState([]);
  const [joinedIds, setJoinedIds] = useState([]);
  const [openDetailsId, setOpenDetailsId] = useState(null);
  const [openPlayersId, setOpenPlayersId] = useState(null);
  const [openDescriptionId, setOpenDescriptionId] = useState(null);
  const [loadingJoin, setLoadingJoin] = useState({});
  const [detailsById, setDetailsById] = useState({});
  const [participantsById, setParticipantsById] = useState({});
  const [confirmJoinId, setConfirmJoinId] = useState(null);
  const [error, setError] = useState("");
  const [hoverId, setHoverId] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [cardMessage, setCardMessage] = useState({});
  const [teamSideChoice, setTeamSideChoice] = useState({});
  const refs = useRef({});

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get("http://localhost:5000/api/headshot");
        const arr = Array.isArray(res.data) ? res.data : [];
        const normalized = arr.map((item, idx) => ({
          ...item,
          __id: String(item.id ?? idx),
        }));
        setTournaments(normalized);

        const tkn = token || localStorage.getItem("token");
        if (tkn) {
          const joined = await axios.get(
            "http://localhost:5000/api/headshot/joined/my",
            { headers: { Authorization: `Bearer ${tkn}` } }
          );
          setJoinedIds(
            Array.isArray(joined.data)
              ? joined.data.map((x) => String(x))
              : []
          );
        } else {
          setJoinedIds([]);
        }
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message ||
            "Failed to load Headshot tournaments"
        );
      }
    }
    load();
  }, [token]);

  const showJoinConfirmation = (idStr, rawDate) => {
    if (joinedIds.includes(idStr) || isJoinClosed(rawDate, nowMs)) return;
    setConfirmJoinId(idStr);
    setCardMessage((s) => ({ ...s, [idStr]: "" }));
  };

  const confirmJoinYes = async (idStr, rawDate, entryFee) => {
    setConfirmJoinId(null);
    setLoadingJoin((s) => ({ ...s, [idStr]: true }));
    const tkn = token || localStorage.getItem("token");
    if (!tkn) {
      setCardMessage((s) => ({
        ...s,
        [idStr]: "❌ Please log in to join.",
      }));
      setLoadingJoin((s) => ({ ...s, [idStr]: false }));
      return;
    }

    if (isJoinClosed(rawDate, nowMs)) {
      setCardMessage((s) => ({
        ...s,
        [idStr]: "❌ Joining is closed shortly before match time.",
      }));
      setLoadingJoin((s) => ({ ...s, [idStr]: false }));
      return;
    }

    const team_side = teamSideChoice[idStr] || "A";

    try {
      const res = await axios.post(
        `http://localhost:5000/api/headshot/${idStr}/join`,
        { team_side },
        { headers: { Authorization: `Bearer ${tkn}` } }
      );

      // mark joined
      setJoinedIds((s) => (s.includes(idStr) ? s : [...s, idStr]));

      // update seats locally using response if it returns counts
      const { joined_count, slots } = res.data || {};
      setTournaments((prev) =>
        prev.map((t) =>
          String(t.__id ?? t.id) === String(idStr)
            ? {
                ...t,
                joined_count:
                  joined_count ?? Number(t.joined_count || 0) + 1,
                slots: slots ?? t.slots,
              }
            : t
        )
      );

      if (typeof refreshUser === "function") {
        await refreshUser();
      }

      setCardMessage((s) => ({
        ...s,
        [idStr]: `✅ Successfully joined as Team ${team_side}`,
      }));
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg === "Insufficient wallet balance") {
        setCardMessage((s) => ({
          ...s,
          [idStr]:
            "❌ Insufficient wallet balance. Please add money to your wallet.",
        }));
      } else if (msg === "Already joined Headshot match") {
        setCardMessage((s) => ({
          ...s,
          [idStr]: "ℹ️ You have already joined this tournament.",
        }));
      } else if (msg === "Match is full") {
        setCardMessage((s) => ({
          ...s,
          [idStr]: "❌ Match is already full.",
        }));
      } else {
        setCardMessage((s) => ({
          ...s,
          [idStr]: "❌ Failed to join tournament.",
        }));
      }
    } finally {
      setLoadingJoin((s) => ({ ...s, [idStr]: false }));
    }
  };

  const confirmJoinNo = (idStr) => {
    setConfirmJoinId(null);
    setCardMessage((s) => ({ ...s, [idStr]: "ℹ️ Join cancelled." }));
    setTimeout(
      () => setCardMessage((s) => ({ ...s, [idStr]: "" })),
      2000
    );
  };

  const fetchDetails = async (idStr) => {
    const tkn = token || localStorage.getItem("token");
    if (!tkn) {
      setError("Please log in first.");
      return;
    }
    setDetailsById((s) => ({ ...s, [idStr]: { loading: true } }));
    try {
      const res = await axios.get(
        `http://localhost:5000/api/headshot/${idStr}/details`,
        { headers: { Authorization: `Bearer ${tkn}` } }
      );
      setDetailsById((s) => ({
        ...s,
        [idStr]: { loading: false, data: res.data },
      }));
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load details";
      setDetailsById((s) => ({
        ...s,
        [idStr]: { loading: false, error: msg },
      }));
    }
  };

  const fetchParticipants = async (idStr) => {
    const tkn = token || localStorage.getItem("token");
       if (!tkn) {
      setParticipantsById((s) => ({
        ...s,
        [idStr]: { loading: false, error: "No token" },
      }));
      return;
    }
    setParticipantsById((s) => ({ ...s, [idStr]: { loading: true } }));
    try {
      const res = await axios.get(
        `http://localhost:5000/api/headshot/${idStr}/participants`,
        { headers: { Authorization: `Bearer ${tkn}` } }
      );
      setParticipantsById((s) => ({
        ...s,
        [idStr]: {
          loading: false,
          data: res.data.participants || [],
          team_a_name: res.data.team_a_name || "",
          team_b_name: res.data.team_b_name || "",
        },
      }));
    } catch (err) {
      const msg =
        err.response?.data?.message || "Failed to load participants";
      setParticipantsById((s) => ({
        ...s,
        [idStr]: { loading: false, error: msg },
      }));
    }
  };

  const toggleDescription = (idStr) => {
    setOpenDetailsId(null);
    setOpenPlayersId(null);
    setOpenDescriptionId((prev) => (prev === idStr ? null : idStr));
  };

  const toggleDetails = (idStr) => {
    setOpenPlayersId(null);
    setOpenDescriptionId(null);
    if (openDetailsId === idStr) {
      setOpenDetailsId(null);
      return;
    }
    setOpenDetailsId(idStr);
    fetchDetails(idStr);
  };

  const togglePlayers = (idStr) => {
    setOpenDetailsId(null);
    setOpenDescriptionId(null);
    if (openPlayersId === idStr) {
      setOpenPlayersId(null);
      return;
    }
    setOpenPlayersId(idStr);
    fetchParticipants(idStr);
  };

  const handleSaveTeamName = async (matchId, sideKey, name) => {
    const tkn = token || localStorage.getItem("token");
    if (!tkn) return;
    try {
      const res = await axios.patch(
        `http://localhost:5000/api/headshot/${matchId}/team-name`,
        { team_side: sideKey, name },
        { headers: { Authorization: `Bearer ${tkn}` } }
      );
      setParticipantsById((s) => ({
        ...s,
        [matchId]: {
          ...s[matchId],
          team_a_name: res.data.team_a_name || "",
          team_b_name: res.data.team_b_name || "",
        },
      }));
    } catch (e) {
      console.error("update team name failed", e);
    }
  };

  const pageStyle = {
    ...pageBase,
    backgroundImage: `linear-gradient(180deg, rgba(7,16,29,0.25), rgba(4,6,14,0.9)), url(${bg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  const visibleTournaments = tournaments.filter(
    (t) => !isTournamentExpired(t.date, nowMs)
  );

  return (
    <div style={pageStyle}>
      <div style={container}>
        <div style={header}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BackButton />
            <h1 style={{ fontSize: 34, margin: 0, fontWeight: 800 }}>
              Headshot CS
            </h1>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#7f1d1d",
              padding: 10,
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <div style={grid}>
          {visibleTournaments.map((t, index) => {
            const idStr = String(t.__id ?? String(t.id ?? index));
            const joined = joinedIds.includes(idStr);
            const isDetailsOpen = openDetailsId === idStr;
            const isPlayersOpen = openPlayersId === idStr;
            const isDescriptionOpen = openDescriptionId === idStr;
            const matchLabel = formatMatchLabel(t.date);
            const joinClosed = isJoinClosed(t.date, nowMs);
            const isConfirming = confirmJoinId === idStr;

            const joinedCount = Number(t.joined_count || 0);
            const slots = Number(t.slots || 0);
            const isFull = slots > 0 && joinedCount >= slots;

            let imageCandidate = thumbDefault;
            if (t.image && String(t.image).startsWith("http")) {
              imageCandidate = t.image;
            } else if (t.image) {
              imageCandidate = t.image;
            }

            const teamChoice = teamSideChoice[idStr] || "A";

            return (
              <div
                key={idStr}
                ref={(el) => (refs.current[idStr] = el)}
                style={{
                  ...cardBase,
                  ...(hoverId === idStr ? cardHover : {}),
                }}
                onMouseEnter={() => setHoverId(idStr)}
                onMouseLeave={() => setHoverId(null)}
              >
                <div>
                  <div style={titleRow}>
                    <img
                      src={imageCandidate}
                      alt="thumb"
                      style={thumbStyle}
                      onError={(ev) => {
                        if (ev?.target && ev.target.src !== thumbDefault) {
                          ev.target.src = thumbDefault;
                          return;
                        }
                        if (ev?.target) {
                          ev.target.src = "/images/thumb-default.jpg";
                        }
                      }}
                    />
                    <div>
                      <h3 style={titleStyle}>{t.name}</h3>
                      <div style={metaStyle}>
                        Entry fee: ₹{t.entry_fee} • Status: {t.status}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: "rgba(226,232,240,0.9)",
                        }}
                      >
                        Match time: {matchLabel}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: "rgba(226,232,240,0.9)",
                        }}
                      >
                        Seats: {joinedCount}/{slots || "—"}
                        {isFull && " • Full"}
                      </div>
                    </div>
                  </div>

                  {joinClosed && (
                    <div style={infoPill}>
                      Match ID &amp; password in 5 min
                    </div>
                  )}

                  {cardMessage[idStr] && !isConfirming && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        color: cardMessage[idStr].startsWith("✅")
                          ? "#22c55e"
                          : cardMessage[idStr].startsWith("ℹ️")
                          ? "#38bdf8"
                          : "#ef4444",
                        padding: "8px 12px",
                        background: "rgba(59,130,246,0.1)",
                        borderRadius: 12,
                        borderLeft: "3px solid",
                        borderLeftColor: cardMessage[idStr].startsWith("✅")
                          ? "#22c55e"
                          : cardMessage[idStr].startsWith("ℹ️")
                          ? "#38bdf8"
                          : "#ef4444",
                      }}
                    >
                      {cardMessage[idStr]}
                    </div>
                  )}
                </div>

                <div>
                  <div style={buttonsRow}>
                    {!joined && !isConfirming && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: "rgba(229,231,235,0.85)",
                          }}
                        >
                          Choose team:
                        </span>
                        <select
                          value={teamChoice}
                          onChange={(e) =>
                            setTeamSideChoice((s) => ({
                              ...s,
                              [idStr]: e.target.value,
                            }))
                          }
                          style={{
                            background: "rgba(15,23,42,0.9)",
                            borderRadius: 999,
                            border: "1px solid rgba(148,163,184,0.4)",
                            color: "#e5e7eb",
                            fontSize: 12,
                            padding: "6px 10px",
                            outline: "none",
                          }}
                          disabled={joinClosed || isFull}
                        >
                          <option value="A">Team A</option>
                          <option value="B">Team B</option>
                        </select>
                      </div>
                    )}

                    {joined ? (
                      <button style={btnJoined} disabled>
                        Joined
                      </button>
                    ) : isConfirming ? (
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          marginBottom: 8,
                          padding: "12px 16px",
                          background: "rgba(59,130,246,0.15)",
                          borderRadius: 12,
                          border: "1px solid rgba(59,130,246,0.3)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#60a5fa",
                            marginRight: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          ℹ️ Entry fee ₹{t.entry_fee} will be deducted
                        </div>
                        <button
                          style={btnConfirmYes}
                          onClick={() =>
                            confirmJoinYes(idStr, t.date, t.entry_fee)
                          }
                          disabled={loadingJoin[idStr] || isFull}
                        >
                          ✅ Yes, Join
                        </button>
                        <button
                          style={btnConfirmNo}
                          onClick={() => confirmJoinNo(idStr)}
                        >
                          ❌ No
                        </button>
                      </div>
                    ) : (
                      <button
                        style={{
                          ...btnPrimary,
                          opacity:
                            joinClosed || isFull || loadingJoin[idStr]
                              ? 0.5
                              : 1,
                          cursor:
                            joinClosed || isFull
                              ? "not-allowed"
                              : "pointer",
                        }}
                        onClick={() => showJoinConfirmation(idStr, t.date)}
                        disabled={loadingJoin[idStr] || joinClosed || isFull}
                      >
                        {isFull
                          ? "Match full"
                          : loadingJoin[idStr]
                          ? "Joining..."
                          : joinClosed
                          ? "Join closed"
                          : "Join"}
                      </button>
                    )}

                    <button
                      style={btnSecondary}
                      onClick={() => toggleDetails(idStr)}
                      disabled={isConfirming}
                    >
                      {isDetailsOpen ? "Hide details" : "Details"}
                    </button>

                    <button
                      style={btnSecondary}
                      onClick={() => togglePlayers(idStr)}
                      disabled={isConfirming}
                    >
                      {isPlayersOpen ? "Hide players" : "Players"}
                    </button>

                    <button
                      style={btnSecondary}
                      onClick={() => toggleDescription(idStr)}
                      disabled={isConfirming}
                    >
                      {isDescriptionOpen ? "Hide description" : "Description"}
                    </button>
                  </div>

                  {isDetailsOpen && (
                    <div style={detailsBox}>
                      {detailsById[idStr]?.loading ? (
                        <div>Loading details…</div>
                      ) : detailsById[idStr]?.data ? (
                        <>
                          <div
                            style={{
                              fontSize: 12,
                              color: "rgba(230,238,248,0.9)",
                            }}
                          >
                            Match time
                          </div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 18,
                              marginBottom: 8,
                            }}
                          >
                            {matchLabel}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 18,
                              marginBottom: 10,
                            }}
                          >
                            <div>
                              <div
                                style={{ fontSize: 12, opacity: 0.8 }}
                              >
                                Room ID
                              </div>
                              <div
                                style={{ fontWeight: 700, fontSize: 16 }}
                              >
                                {detailsById[idStr].data.room_id}
                              </div>
                            </div>
                            <div>
                              <div
                                style={{ fontSize: 12, opacity: 0.8 }}
                              >
                                Password
                              </div>
                              <div
                                style={{ fontWeight: 700, fontSize: 16 }}
                              >
                                {detailsById[idStr].data.room_password}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            color: "rgba(230,238,248,0.85)",
                            marginBottom: 4,
                          }}
                        >
                          {detailsById[idStr]?.error ||
                            "Room not configured yet"}
                        </div>
                      )}
                    </div>
                  )}

                  {isDescriptionOpen && (
                    <div style={detailsBox}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          marginBottom: 12,
                          color: "#e6eef8",
                        }}
                      >
                        Tournament Description
                      </div>
                      {t.description ? (
                        <div
                          style={{
                            fontSize: 14,
                            lineHeight: 1.6,
                            color: "rgba(230,238,248,0.95)",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {t.description}
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: 14,
                            color: "rgba(230,238,248,0.7)",
                          }}
                        >
                          No description available for this tournament.
                        </div>
                      )}
                    </div>
                  )}

                  {isPlayersOpen && (
                    <div style={participantsPanel}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          marginBottom: 4,
                        }}
                      >
                        PARTICIPANTS
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "rgba(209,213,219,0.9)",
                          marginBottom: 8,
                        }}
                      >
                        Teams and players for this match
                      </div>
                      <div style={participantsInner}>
                        {participantsById[idStr]?.loading ? (
                          <div style={{ fontSize: 13 }}>
                            Loading participants…
                          </div>
                        ) : participantsById[idStr]?.data &&
                          participantsById[idStr].data.length > 0 ? (
                          (() => {
                            const { teamA, teamB, none } = groupByTeam(
                              participantsById[idStr].data
                            );
                            const aName =
                              participantsById[idStr].team_a_name ||
                              "Team A";
                            const bName =
                              participantsById[idStr].team_b_name ||
                              "Team B";

                            const meA = teamA.find((p) => p.is_me);
                            const meB = teamB.find((p) => p.is_me);

                            return (
                              <>
                                <div style={teamColumns}>
                                  <TeamBox
                                    label={aName}
                                    sideKey="A"
                                    list={teamA}
                                    isLeader={!!meA?.is_team_leader}
                                    initialName={aName}
                                    onSave={(side, name) =>
                                      handleSaveTeamName(idStr, side, name)
                                    }
                                  />
                                  <TeamBox
                                    label={bName}
                                    sideKey="B"
                                    list={teamB}
                                    isLeader={!!meB?.is_team_leader}
                                    initialName={bName}
                                    onSave={(side, name) =>
                                      handleSaveTeamName(idStr, side, name)
                                    }
                                  />
                                </div>
                                {none.length > 0 && (
                                  <div
                                    style={{
                                      marginTop: 10,
                                      fontSize: 12,
                                      color: "rgba(209,213,219,0.85)",
                                    }}
                                  >
                                    Players without team:{" "}
                                    {none
                                      .map((p) => p.name || "Unknown")
                                      .join(", ")}
                                  </div>
                                )}
                              </>
                            );
                          })()
                        ) : (
                          <div
                            style={{
                              fontSize: 13,
                              color: "rgba(209,213,219,0.9)",
                              padding: "4px 2px",
                            }}
                          >
                            No players have joined yet.
                          </div>
                        )}
                      </div>
                      <div style={badgeCount}>
                        {participantsById[idStr]?.data
                          ? `${participantsById[idStr].data.length} players`
                          : "0 players"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes detailsFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
}