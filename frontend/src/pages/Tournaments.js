// frontend/src/pages/Tournaments.js
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
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
  const isToday = isSameDay(dt, now);
  const timeStr = dt.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (isToday) return `Today at ${timeStr}`;
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
  const diffMs = dt.getTime() - nowMs;
  const diffMin = diffMs / 60000;
  return diffMin <= 5;
}

function isTournamentExpired(rawDate, nowMs) {
  const dt = parseMatchDate(rawDate);
  if (!dt) return false;
  const cutoff = dt.getTime() + 2 * 60 * 1000;
  return nowMs > cutoff;
}

/* ---------- Styles (UNCHANGED) ---------- */
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
const smallCopyBtn = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "transparent",
  color: "#e6eef8",
  cursor: "pointer",
  fontSize: 12,
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
const badgeCount = {
  marginTop: 10,
  alignSelf: "flex-end",
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(148,163,184,0.16)",
  fontSize: 11,
  color: "#e5e7eb",
};

/* ---- Team table styles ---- */
const teamTableWrapper = {
  marginTop: 10,
  borderRadius: 16,
  padding: 10,
  background: "rgba(15,23,42,0.9)",
};
const teamTableHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
};
const teamGrid = {
  display: "grid",
  gap: 8,
};
const groupCard = {
  borderRadius: 12,
  padding: 10,
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.9), rgba(15,23,42,0.98))",
  border: "1px solid rgba(148,163,184,0.25)",
};
const groupTitleRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
};
const teamNameInput = {
  background: "rgba(15,23,42,0.9)",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.5)",
  padding: "4px 10px",
  fontSize: 12,
  color: "#e5e7eb",
  outline: "none",
};
const groupSlotsRow = {
  display: "grid",
  gap: 6,
};
const slotBox = {
  borderRadius: 10,
  padding: "6px 8px",
  border: "1px dashed rgba(148,163,184,0.35)",
  background: "rgba(15,23,42,0.9)",
  fontSize: 12,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};
const slotEmpty = {
  color: "rgba(156,163,175,0.8)",
  fontStyle: "italic",
};
const slotFilled = {
  color: "#e5e7eb",
};
const slotSelectBtn = {
  ...smallCopyBtn,
  fontSize: 11,
};

/* ---------- Component ---------- */
export default function Tournaments() {
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

  const [teamDataByTournament, setTeamDataByTournament] = useState({});
  const [teamLoading, setTeamLoading] = useState({});
  const [teamError, setTeamError] = useState({});
  const refs = useRef({});

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  // ✅ New: one reusable function to refresh list + joined ids
  const refreshTournamentsAndJoined = async () => {
    try {
      // cache-buster to avoid stale 304 on dynamic seats
      const res = await axios.get(
        `http://localhost:5000/api/tournaments?ts=${Date.now()}`,
        { headers: { "Cache-Control": "no-cache" } }
      );

      const arr = Array.isArray(res.data) ? res.data : [];
      const normalized = arr.map((item, idx) => ({
        ...item,
        __id: String(item.id ?? idx),
      }));
      setTournaments(normalized);

      const token = localStorage.getItem("token");
      if (token) {
        const joined = await axios.get(
          "http://localhost:5000/api/tournaments/joined/my",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setJoinedIds(
          Array.isArray(joined.data) ? joined.data.map((x) => String(x)) : []
        );
      } else {
        setJoinedIds([]);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load tournaments");
    }
  };

  // initial load
  useEffect(() => {
    refreshTournamentsAndJoined();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const showJoinConfirmation = (idStr, rawDate) => {
    const tItem = tournaments.find((x) => String(x.__id ?? x.id) === idStr);
    if (!tItem) return;

    if (tItem.is_locked) {
      setCardMessage((s) => ({
        ...s,
        [idStr]: "❌ This tournament is locked by admin. You can no longer join.",
      }));
      return;
    }
    if (joinedIds.includes(idStr) || isJoinClosed(rawDate, nowMs)) return;

    setConfirmJoinId(idStr);
    setCardMessage((s) => ({ ...s, [idStr]: "" }));
  };

  const confirmJoinYes = async (idStr, rawDate) => {
    setConfirmJoinId(null);
    setLoadingJoin((s) => ({ ...s, [idStr]: true }));

    const token = localStorage.getItem("token");
    if (!token) {
      setCardMessage((s) => ({ ...s, [idStr]: "❌ Please log in to join." }));
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

    try {
      const res = await axios.post(
        `http://localhost:5000/api/tournaments/${idStr}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.message === "Tournament is locked") {
        setCardMessage((s) => ({
          ...s,
          [idStr]:
            "❌ This tournament is locked by admin. You can no longer join.",
        }));
        setLoadingJoin((s) => ({ ...s, [idStr]: false }));
        return;
      }

      setJoinedIds((s) => (s.includes(idStr) ? s : [...s, idStr]));

      const { joined_count, slots } = res.data || {};
      setTournaments((prev) =>
        prev.map((t) =>
          String(t.__id ?? t.id) === String(idStr)
            ? {
                ...t,
                joined_count: joined_count ?? Number(t.joined_count || 0) + 1,
                slots: slots ?? t.slots,
              }
            : t
        )
      );

      // ✅ refresh list once so duo/squad/seat counters stay correct too
      await refreshTournamentsAndJoined();

      setCardMessage((s) => ({
        ...s,
        [idStr]: "✅ Successfully joined the tournament 🎉",
      }));
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg === "Insufficient wallet balance") {
        setCardMessage((s) => ({
          ...s,
          [idStr]:
            "❌ Insufficient wallet balance. Please add money to your wallet.",
        }));
      } else if (msg === "Already joined tournament") {
        setCardMessage((s) => ({
          ...s,
          [idStr]: "ℹ️ You have already joined this tournament.",
        }));
      } else if (msg === "Match is full") {
        setCardMessage((s) => ({ ...s, [idStr]: "❌ Match is already full." }));
      } else if (msg === "Tournament is locked") {
        setCardMessage((s) => ({
          ...s,
          [idStr]:
            "❌ This tournament is locked by admin. You can no longer join.",
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
    setTimeout(() => setCardMessage((s) => ({ ...s, [idStr]: "" })), 2000);
  };

  const fetchDetails = async (idStr) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in first.");
      return;
    }
    setDetailsById((s) => ({ ...s, [idStr]: { loading: true } }));
    try {
      const res = await axios.get(
        `http://localhost:5000/api/tournaments/${idStr}/details`,
        { headers: { Authorization: `Bearer ${token}` } }
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
    const token = localStorage.getItem("token");
    if (!token) {
      setParticipantsById((s) => ({
        ...s,
        [idStr]: { loading: false, error: "No token" },
      }));
      return;
    }
    setParticipantsById((s) => ({ ...s, [idStr]: { loading: true } }));
    try {
      const res = await axios.get(
        `http://localhost:5000/api/tournaments/${idStr}/participants`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setParticipantsById((s) => ({
        ...s,
        [idStr]: { loading: false, data: res.data.participants || [] },
      }));
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load participants";
      setParticipantsById((s) => ({
        ...s,
        [idStr]: { loading: false, error: msg },
      }));
    }
  };

  const fetchTeamTable = async (idStr) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setTeamError((s) => ({ ...s, [idStr]: "Please log in first" }));
      return;
    }

    setTeamLoading((s) => ({ ...s, [idStr]: true }));
    setTeamError((s) => ({ ...s, [idStr]: "" }));

    try {
      const res = await axios.get(
        `http://localhost:5000/api/tournaments/${idStr}/teams`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTeamDataByTournament((s) => ({ ...s, [idStr]: res.data }));
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load team table";
      setTeamError((s) => ({ ...s, [idStr]: msg }));
    } finally {
      setTeamLoading((s) => ({ ...s, [idStr]: false }));
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

  const togglePlayers = (idStr, modeRaw) => {
    setOpenDetailsId(null);
    setOpenDescriptionId(null);
    if (openPlayersId === idStr) {
      setOpenPlayersId(null);
      return;
    }
    setOpenPlayersId(idStr);

    const lowerMode = (modeRaw || "").toLowerCase();
    if (lowerMode === "duo" || lowerMode === "squad") fetchTeamTable(idStr);
    else fetchParticipants(idStr);
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text));
    } catch (err) {
      console.error("copy failed", err);
    }
  };

  // ✅ UPDATED: also refresh tournaments list after selecting slot
  const handleSelectSlot = async (tournamentIdStr, groupNo, slotNo) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setTeamError((s) => ({ ...s, [tournamentIdStr]: "Please log in first" }));
      return;
    }

    try {
      await axios.post(
        `http://localhost:5000/api/tournaments/${tournamentIdStr}/teams/${groupNo}/slot/${slotNo}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchTeamTable(tournamentIdStr);

      // ✅ this makes Seats update on the cards without clicking Players
      await refreshTournamentsAndJoined();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to select slot";
      setTeamError((s) => ({ ...s, [tournamentIdStr]: msg }));
    }
  };

  const handleTeamNameBlur = async (tournamentIdStr, groupNo, newName, original) => {
    if (newName === original) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setTeamError((s) => ({ ...s, [tournamentIdStr]: "Please log in first" }));
      return;
    }

    try {
      await axios.put(
        `http://localhost:5000/api/tournaments/${tournamentIdStr}/teams/${groupNo}/name`,
        { team_name: newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchTeamTable(tournamentIdStr);
      await refreshTournamentsAndJoined(); // keep list fresh
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update team name";
      setTeamError((s) => ({ ...s, [tournamentIdStr]: msg }));
    }
  };

  const pageStyle = {
    ...pageBase,
    backgroundImage: `linear-gradient(180deg, rgba(7,16,29,0.25), rgba(4,6,14,0.9)), url(${bg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  const visibleTournaments = tournaments.filter((t) => {
    if (isTournamentExpired(t.date, nowMs)) return false;
    if (!t.mode) return true;
    const m = String(t.mode).toLowerCase();
    return ["solo", "duo", "squad", "br_single"].includes(m);
  });

  return (
    <div style={pageStyle}>
      <div style={container}>
        <div style={header}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BackButton />
            <h1 style={{ fontSize: 34, margin: 0, fontWeight: 800 }}>
              Tournaments
            </h1>
          </div>
          <div style={{ color: "rgba(230,238,248,0.85)" }}>
            Join upcoming matches and manage your team.
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

            const vsLine =
              t.team_a_name && t.team_b_name
                ? `${t.team_a_name} vs ${t.team_b_name}`
                : null;

            const joinedCount = Number(t.joined_count || 0);
            const slots = Number(t.slots || 0);
            const isFull = slots > 0 && joinedCount >= slots;

            let imageCandidate = thumbDefault;
            if (t.image && String(t.image).startsWith("http")) imageCandidate = t.image;
            else if (t.image) imageCandidate = t.image;

            const modeRaw = (t.mode || "").toLowerCase();
            const modeLabel =
              modeRaw === "duo" ? "Duo" : modeRaw === "squad" ? "Squad" : "Solo";

            const isLocked = !!t.is_locked;

            const teamData = teamDataByTournament[idStr];
            const isTeamMode = modeRaw === "duo" || modeRaw === "squad";

            // ✅ Seats counters: prefer list fields (t.*), fallback to teamData if opened
            const teamsJoined = Number(t.teams_joined ?? teamData?.teams_joined ?? 0);
            const totalTeams = Number(
              t.total_teams ?? teamData?.total_teams ?? (modeRaw === "duo" ? 24 : 12)
            );

            const playersJoined = Number(t.players_joined ?? teamData?.players_joined ?? 0);
            const totalPlayers = Number(
              t.total_players ??
                teamData?.total_players ??
                totalTeams * (modeRaw === "duo" ? 2 : 4)
            );

            const lockedFromTeamApi = !!(teamData?.locked || teamData?.is_locked);
            const teamsLocked = isTeamMode ? lockedFromTeamApi : false;

            const groupsArr = Array.isArray(teamData?.groups) ? teamData.groups : null;
            const oldTeamsArr = Array.isArray(teamData?.teams) ? teamData.teams : null;

            return (
              <div
                key={idStr}
                ref={(el) => (refs.current[idStr] = el)}
                style={{ ...cardBase, ...(hoverId === idStr ? cardHover : {}) }}
                onMouseEnter={() => setHoverId(idStr)}
                onMouseLeave={() => setHoverId(null)}
              >
                {/* ---- FROM HERE YOUR RENDER IS UNCHANGED except seats already uses teamsJoined etc ---- */}
                {/* ...keep the rest of your JSX exactly same... */}
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
                        if (ev?.target) ev.target.src = "/images/thumb-default.jpg";
                      }}
                    />
                    <div>
                      <h3 style={titleStyle}>{t.name}</h3>

                      {vsLine && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "rgba(226,232,240,0.95)",
                            marginTop: 2,
                          }}
                        >
                          {vsLine}
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          marginTop: 6,
                          alignItems: "center",
                        }}
                      >
                        <span style={metaStyle}>
                          Entry fee: ₹{t.entry_fee} • Status: {t.status}
                        </span>

                        {typeof t.price_pool !== "undefined" && (
                          <span
                            style={{
                              background: "rgba(22,163,74,0.15)",
                              color: "#bbf7d0",
                              borderRadius: 999,
                              padding: "4px 10px",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            Prize pool: ₹{t.price_pool}
                          </span>
                        )}

                        <span
                          style={{
                            background: "rgba(59,130,246,0.2)",
                            color: "#bfdbfe",
                            borderRadius: 999,
                            padding: "4px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          Mode: {modeLabel}
                        </span>
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

                      {/* FIXED: Seats line for duo/squad uses team counters */}
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: "rgba(226,232,240,0.9)",
                        }}
                      >
                        {isTeamMode ? (
                          <>
                            Seats: {teamsJoined}/{totalTeams}{" "}
                            <span style={{ fontSize: 12, opacity: 0.85 }}>
                              ({playersJoined}/{totalPlayers})
                            </span>
                          </>
                        ) : (
                          <>
                            Seats: {joinedCount}/{slots || "—"}
                            {isFull && " • Full"}
                          </>
                        )}
                      </div>

                      {isLocked && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: "#f97373",
                            fontWeight: 600,
                          }}
                        >
                          This tournament is locked by admin. You can no longer
                          make changes.
                        </div>
                      )}
                    </div>
                  </div>

                  {joinClosed && !isLocked && (
                    <div style={infoPill}>Match ID &amp; password in 5 min</div>
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
                          onClick={() => confirmJoinYes(idStr, t.date)}
                          disabled={loadingJoin[idStr] || isFull || isLocked}
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
                            joinClosed || isFull || loadingJoin[idStr] || isLocked
                              ? 0.5
                              : 1,
                          cursor:
                            joinClosed || isFull || isLocked
                              ? "not-allowed"
                              : "pointer",
                        }}
                        onClick={() => showJoinConfirmation(idStr, t.date)}
                        disabled={loadingJoin[idStr] || joinClosed || isFull || isLocked}
                      >
                        {isLocked
                          ? "Locked"
                          : isFull
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
                      onClick={() => togglePlayers(idStr, modeRaw)}
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
                          <div style={{ fontSize: 12, color: "rgba(230,238,248,0.9)" }}>
                            Match time
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                            {matchLabel}
                          </div>

                          <div style={{ display: "flex", gap: 18, marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 12, opacity: 0.8 }}>Room ID</div>
                              <div style={{ fontWeight: 700, fontSize: 16 }}>
                                {detailsById[idStr].data.room_id}
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: 12, opacity: 0.8 }}>Password</div>
                              <div style={{ fontWeight: 700, fontSize: 16 }}>
                                {detailsById[idStr].data.room_password}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <button
                              style={smallCopyBtn}
                              type="button"
                              onClick={() => copyText(detailsById[idStr].data.room_id)}
                            >
                              Copy ID
                            </button>
                            <button
                              style={smallCopyBtn}
                              type="button"
                              onClick={() => copyText(detailsById[idStr].data.room_password)}
                            >
                              Copy password
                            </button>
                            <button
                              style={smallCopyBtn}
                              type="button"
                              onClick={() =>
                                copyText(
                                  `${detailsById[idStr].data.room_id} ${detailsById[idStr].data.room_password}`
                                )
                              }
                            >
                              Copy both
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{ color: "rgba(230,238,248,0.85)", marginBottom: 4 }}>
                          {detailsById[idStr]?.error || "Room not configured yet"}
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
                        <div style={{ fontSize: 14, color: "rgba(230,238,248,0.7)" }}>
                          No description available for this tournament.
                        </div>
                      )}
                    </div>
                  )}

                  {isPlayersOpen && (
                    <div style={participantsPanel}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                        {isTeamMode ? "TEAMS & SLOTS" : "PARTICIPANTS"}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(209,213,219,0.9)", marginBottom: 8 }}>
                        {isTeamMode
                          ? "Select your group and slot after joining."
                          : "Joined players for this tournament"}
                      </div>

                      {isTeamMode ? (
                        <div style={teamTableWrapper}>
                          {teamLoading[idStr] ? (
                            <div style={{ fontSize: 13 }}>Loading team table…</div>
                          ) : teamError[idStr] ? (
                            <div style={{ fontSize: 13, color: "#fecaca" }}>
                              {teamError[idStr]}
                            </div>
                          ) : teamData ? (
                            <>
                              {teamsLocked && (
                                <div
                                  style={{
                                    marginBottom: 8,
                                    fontSize: 12,
                                    color: "#fca5a5",
                                    fontWeight: 600,
                                  }}
                                >
                                  Tournament is locked. Team changes are disabled.
                                </div>
                              )}

                              <div style={teamTableHeaderRow}>
                                <span style={{ fontSize: 12, color: "rgba(209,213,219,0.8)" }}>
                                  Mode: {modeLabel} • Groups:{" "}
                                  {Array.isArray(groupsArr)
                                    ? groupsArr.length
                                    : oldTeamsArr?.length || 0}
                                </span>
                              </div>

                              <div style={teamGrid}>
                                {/* NEW GROUPS FORMAT */}
                                {Array.isArray(groupsArr)
                                  ? groupsArr.map((g) => {
                                      const slotsInGroup = modeRaw === "duo" ? 2 : 4;
                                      const players = Array.isArray(g.players)
                                        ? g.players
                                        : [];

                                      // team name editable only when backend says leader_user_id == logged user id
                                      // If you don't store user id, keep it simple: allow only if g.leader_user_id is truthy AND user_has_team is true and group has your user_id in players.
                                      // For now: keep same UX as before using lock only (leader check depends on your auth storage).
                                      const canEditName = !teamsLocked && !!g.leader_user_id;

                                      return (
                                        <div key={g.group_no} style={groupCard}>
                                          <div style={groupTitleRow}>
                                            <div
                                              style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: "rgba(209,213,219,0.9)",
                                              }}
                                            >
                                              Group {g.group_no}
                                            </div>

                                            <div
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 6,
                                              }}
                                            >
                                              <span
                                                style={{
                                                  fontSize: 11,
                                                  color: "rgba(148,163,184,0.9)",
                                                }}
                                              >
                                                Team Name:
                                              </span>
                                              <input
                                                style={teamNameInput}
                                                type="text"
                                                defaultValue={g.team_name || ""}
                                                placeholder="Enter team name"
                                                disabled={!canEditName}
                                                onBlur={(e) =>
                                                  handleTeamNameBlur(
                                                    idStr,
                                                    g.group_no,
                                                    e.target.value,
                                                    g.team_name || ""
                                                  )
                                                }
                                              />
                                            </div>
                                          </div>

                                          <div
                                            style={{
                                              ...groupSlotsRow,
                                              gridTemplateColumns:
                                                modeRaw === "duo"
                                                  ? "repeat(2, minmax(0,1fr))"
                                                  : "repeat(2, minmax(0,1fr))",
                                            }}
                                          >
                                            {Array.from(
                                              { length: slotsInGroup },
                                              (_, i) => i + 1
                                            ).map((slotNo) => {
                                              const p = players[slotNo - 1]; // expected index aligned
                                              const occupied = !!(p && p.username);

                                              const canSelect =
                                                !occupied &&
                                                !teamsLocked &&
                                                !teamData.user_has_team;

                                              return (
                                                <div key={slotNo} style={slotBox}>
                                                  <div>
                                                    {occupied ? (
                                                      <div style={slotFilled}>
                                                        <div style={{ fontWeight: 600, fontSize: 12 }}>
                                                          {p.username}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.9)" }}>
                                                          ID: {p.player_game_id || "—"}
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <span style={slotEmpty}>Empty slot</span>
                                                    )}
                                                  </div>

                                                  <div
                                                    style={{
                                                      display: "flex",
                                                      flexDirection: "column",
                                                      alignItems: "flex-end",
                                                      gap: 4,
                                                    }}
                                                  >
                                                    <span style={{ fontSize: 10, color: "rgba(148,163,184,0.9)" }}>
                                                      Slot {slotNo}
                                                    </span>

                                                    {occupied ? (
                                                      p.player_game_id ? (
                                                        <button
                                                          style={smallCopyBtn}
                                                          type="button"
                                                          onClick={() => copyText(p.player_game_id)}
                                                        >
                                                          Copy ID
                                                        </button>
                                                      ) : null
                                                    ) : canSelect ? (
                                                      <button
                                                        style={slotSelectBtn}
                                                        type="button"
                                                        onClick={() => handleSelectSlot(idStr, g.group_no, slotNo)}
                                                      >
                                                        Select
                                                      </button>
                                                    ) : null}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })
                                  : null}

                                {/* OLD TEAMS FORMAT (fallback) */}
                                {!Array.isArray(groupsArr) &&
                                  Array.isArray(oldTeamsArr) &&
                                  oldTeamsArr.map((team) => {
                                    const slotsInGroup = modeRaw === "duo" ? 2 : 4;
                                    const sortedMembers = (team.members || []).sort(
                                      (a, b) => Number(a.slot_no) - Number(b.slot_no)
                                    );
                                    const memberBySlot = {};
                                    sortedMembers.forEach((m) => {
                                      memberBySlot[m.slot_no] = m;
                                    });

                                    return (
                                      <div key={team.id} style={groupCard}>
                                        <div style={groupTitleRow}>
                                          <div
                                            style={{
                                              fontSize: 12,
                                              fontWeight: 600,
                                              color: "rgba(209,213,219,0.9)",
                                            }}
                                          >
                                            Group {team.group_no}
                                          </div>
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 6,
                                            }}
                                          >
                                            <span style={{ fontSize: 11, color: "rgba(148,163,184,0.9)" }}>
                                              Team Name:
                                            </span>
                                            <input
                                              style={teamNameInput}
                                              type="text"
                                              defaultValue={team.team_name || ""}
                                              placeholder="Enter team name"
                                              disabled={!team.is_leader || teamsLocked}
                                              onBlur={(e) =>
                                                handleTeamNameBlur(
                                                  idStr,
                                                  team.group_no,
                                                  e.target.value,
                                                  team.team_name || ""
                                                )
                                              }
                                            />
                                          </div>
                                        </div>

                                        <div
                                          style={{
                                            ...groupSlotsRow,
                                            gridTemplateColumns:
                                              modeRaw === "duo"
                                                ? "repeat(2, minmax(0,1fr))"
                                                : "repeat(2, minmax(0,1fr))",
                                          }}
                                        >
                                          {Array.from({ length: slotsInGroup }, (_, i) => i + 1).map(
                                            (slotNo) => {
                                              const m = memberBySlot[slotNo];
                                              const canSelect =
                                                !m &&
                                                !teamsLocked &&
                                                !team.has_me &&
                                                !teamData.user_has_team;

                                              return (
                                                <div key={slotNo} style={slotBox}>
                                                  <div>
                                                    {m ? (
                                                      <div style={slotFilled}>
                                                        <div style={{ fontWeight: 600, fontSize: 12 }}>
                                                       {m.username}
                                                        </div>
                                                        <div
                                                          style={{
                                                            fontSize: 11,
                                                            color:
                                                              "rgba(148,163,184,0.9)",
                                                          }}
                                                        >
                                                          ID: {m.player_game_id || "—"}
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <span style={slotEmpty}>
                                                        Empty slot
                                                      </span>
                                                    )}
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
                                                        fontSize: 10,
                                                        color:
                                                          "rgba(148,163,184,0.9)",
                                                      }}
                                                    >
                                                      Slot {slotNo}
                                                    </span>

                                                    {m ? (
                                                      m.player_game_id ? (
                                                        <button
                                                          style={smallCopyBtn}
                                                          type="button"
                                                          onClick={() =>
                                                            copyText(
                                                              m.player_game_id
                                                            )
                                                          }
                                                        >
                                                          Copy ID
                                                        </button>
                                                      ) : null
                                                    ) : canSelect ? (
                                                      <button
                                                        style={slotSelectBtn}
                                                        type="button"
                                                        onClick={() =>
                                                          handleSelectSlot(
                                                            idStr,
                                                            team.group_no,
                                                            slotNo
                                                          )
                                                        }
                                                      >
                                                        Select
                                                      </button>
                                                    ) : null}
                                                  </div>
                                                </div>
                                              );
                                            }
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </>
                          ) : (
                            <div
                              style={{
                                fontSize: 13,
                                color: "rgba(209,213,219,0.9)",
                              }}
                            >
                              No team data.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={participantsInner}>
                          {participantsById[idStr]?.loading ? (
                            <div style={{ fontSize: 13 }}>
                              Loading participants…
                            </div>
                          ) : participantsById[idStr]?.data &&
                            participantsById[idStr].data.length > 0 ? (
                            participantsById[idStr].data.map((p, idx) => (
                              <div
                                key={p.id || idx}
                                style={participantRow}
                              >
                                <div style={participantLeft}>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      fontSize: 13,
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    {p.name || "Unknown"}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color:
                                        "rgba(209,213,219,0.95)",
                                    }}
                                  >
                                    Freefire ID:{" "}
                                    {p.freefireId ? p.freefireId : "—"}
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
                                      color:
                                        "rgba(209,213,219,0.8)",
                                    }}
                                  >
                                    #{idx + 1}
                                  </span>
                                  {p.freefireId && (
                                    <button
                                      type="button"
                                      style={smallCopyBtn}
                                      onClick={() =>
                                        copyText(p.freefireId)
                                      }
                                    >
                                      Copy ID
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div
                              style={{
                                fontSize: 13,
                                color:
                                  "rgba(209,213,219,0.9)",
                                padding: "4px 2px",
                              }}
                            >
                              No players have joined yet.
                            </div>
                          )}

                          <div style={badgeCount}>
                            {participantsById[idStr]?.data
                              ? `${participantsById[idStr].data.length} players`
                              : "0 players"}
                          </div>
                        </div>
                      )}
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