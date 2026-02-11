// src/pages/AdminLeaderboard.js
import React, { useMemo, useState } from "react";
import axios from "axios";

const pageBase = {
  minHeight: "100vh",
  padding: "40px 24px",
  boxSizing: "border-box",
  color: "#e6eef8",
  fontFamily:
    "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  background:
    "radial-gradient(circle at top, #0f172a 0, #020617 45%, #020617 100%)",
};

const container = { maxWidth: 1400, margin: "0 auto" };

const card = {
  background: "rgba(15,23,42,0.98)",
  borderRadius: 20,
  padding: 16,
  boxShadow: "0 14px 32px rgba(0,0,0,0.7)",
  border: "1px solid rgba(148,163,184,0.15)",
};

const row3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };

const label = { fontSize: 12, marginBottom: 4, color: "rgba(226,232,240,0.9)" };

const inputStyle = {
  width: "100%",
  padding: "9px 10px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.5)",
  background: "rgba(15,23,42,0.95)",
  color: "#e5e7eb",
  fontSize: 13,
  outline: "none",
};

const btnPrimary = {
  padding: "9px 14px",
  borderRadius: 999,
  border: "none",
  backgroundImage: "linear-gradient(90deg,#38bdf8,#22c55e)",
  color: "#020617",
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",
};

const btnSecondary = {
  padding: "9px 14px",
  borderRadius: 999,
  border: "none",
  backgroundImage: "linear-gradient(90deg,#a78bfa,#f59e0b)",
  color: "#020617",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

const btnGhost = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.6)",
  background: "transparent",
  color: "#e5e7eb",
  fontSize: 12,
  cursor: "pointer",
};

const table = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  overflow: "hidden",
  borderRadius: 12,
  marginTop: 12,
};

const th = {
  textAlign: "left",
  fontSize: 12,
  fontWeight: 800,
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
  verticalAlign: "top",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.60)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 9999,
};

const modalCard = {
  width: "min(880px, 100%)",
  borderRadius: 18,
  border: "1px solid rgba(148,163,184,0.20)",
  background: "rgba(2,6,23,0.92)",
  boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
  overflow: "hidden",
};

const modalHeader = {
  padding: 14,
  borderBottom: "1px solid rgba(148,163,184,0.14)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const modalBody = { padding: 14 };

const pill = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(15,23,42,0.55)",
  fontSize: 12,
  color: "#cbd5e1",
  whiteSpace: "nowrap",
};

const API_BASE = "http://localhost:5000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token
    ? {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      }
    : {};
}

function keyOf(t) {
  if (t._row_type === "solo") return `user:${t.user_id}`;
  if (t.team_id != null) return `team:${t.team_id}`;
  if (t.group_no != null) return `group:${t.group_no}`;
  return `row:${Math.random()}`;
}

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function filledCount(players) {
  return safeArr(players).filter((p) => !!(p?.user_id || p?.username || p?.player_game_id)).length;
}

function ensureSlots(players, totalSlots) {
  const list = safeArr(players);
  if (totalSlots <= 0) return list;

  const withSlot = list.some((p) => p?.slot_no != null);

  let normalized = [];
  if (withSlot) {
    const map = {};
    for (const p of list) {
      const sn = p?.slot_no != null ? Number(p.slot_no) : null;
      if (sn != null) map[sn] = p;
    }
    for (let i = 1; i <= totalSlots; i++) {
      normalized.push(
        map[i] || {
          slot_no: i,
          username: "",
          player_game_id: "",
          user_id: null,
          _empty: true,
        }
      );
    }
    return normalized;
  }

  normalized = list.map((p, idx) => ({
    slot_no: idx + 1,
    username: p?.username || p?.name || "",
    player_game_id: p?.player_game_id || p?.game_id || "",
    user_id: p?.user_id ?? null,
    team_side: p?.team_side || null,
    is_team_leader: p?.is_team_leader || false,
  }));

  while (normalized.length < totalSlots) {
    normalized.push({
      slot_no: normalized.length + 1,
      username: "",
      player_game_id: "",
      user_id: null,
      _empty: true,
    });
  }

  return normalized.slice(0, totalSlots);
}

function guessTotalSlots({ matchType, boardType, teamRow }) {
  if (matchType === "tournament") {
    if (boardType === "solo" || teamRow?._row_type === "solo") return 1;
    if (boardType === "duo") return 2;
    return 4;
  }

  if (matchType === "b2b") {
    if (boardType === "duo") return 2;
    return 4;
  }

  if (matchType === "cs") {
    if (boardType === "duo") return 4;
    return 8;
  }

  if (matchType === "headshot") {
    if (boardType === "duo") return 4;
    return 8;
  }

  return 1;
}

function normalizeTournamentAdminData(data) {
  if (!data) return { boardType: "", teams: [] };

  if (data.type === "solo") {
    const rows = Array.isArray(data.rows) ? data.rows : [];
    return {
      boardType: "solo",
      teams: rows.map((r) => ({
        _row_type: "solo",
        user_id: r.user_id,
        rank: r.rank,
        team_id: null,
        group_no: null,
        team_name: r.name,
        score: r.score ?? 0,
        players: [
          {
            user_id: r.user_id,
            username: r.name,
            player_game_id: r.game_id,
            slot_no: 1,
          },
        ],
      })),
    };
  }

  const teams = Array.isArray(data.teams) ? data.teams : [];
  return {
    boardType: data.type || "",
    teams: teams.map((t) => ({
      _row_type: "team",
      team_id: t.team_id,
      group_no: t.group_no,
      team_name: t.team_name,
      rank: t.rank,
      score: t.team_score ?? t.score ?? 0,
      players: Array.isArray(t.players) ? t.players : [],
    })),
  };
}

function normalizeGenericAdminData(data, matchType) {
  const teams = Array.isArray(data?.teams) ? data.teams : [];

  let detectedMode = data?.mode || data?.match_mode || "";
  if (!detectedMode) {
    if (teams.length > 0) {
      const firstTeamPlayers = safeArr(teams[0]?.players);
      if (firstTeamPlayers.length > 5) detectedMode = "squad";
      else if (firstTeamPlayers.length > 0) detectedMode = "duo";
    }
  }

  return {
    boardType: detectedMode || matchType,
    teams: teams.map((t) => ({
      _row_type: "team",
      team_id: t.team_id ?? null,
      group_no: t.group_no ?? null,
      team_name: t.team_name ?? "",
      rank: t.rank ?? null,
      score: t.score ?? 0,
      players: Array.isArray(t.players) ? t.players : [],
    })),
  };
}

function isTop3(rank) {
  const r = Number(rank);
  return r === 1 || r === 2 || r === 3;
}

function moneyToNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export default function AdminLeaderboard() {
  const headers = useMemo(() => getAuthHeaders(), []);

  const [matchType, setMatchType] = useState("tournament");
  const [matchId, setMatchId] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [teams, setTeams] = useState([]);
  const [boardType, setBoardType] = useState("");
  const [editScore, setEditScore] = useState({});
  const [saving, setSaving] = useState({});

  // Prize modal state
  const [prizeOpen, setPrizeOpen] = useState(false);
  const [prizeRow, setPrizeRow] = useState(null);
  const [prizeAmountTotal, setPrizeAmountTotal] = useState("");
  const [prizeNote, setPrizeNote] = useState("");
  const [prizeMode, setPrizeMode] = useState("split"); // split | manual
  const [prizePerUser, setPrizePerUser] = useState({}); // user_id -> amount
  const [prizeSending, setPrizeSending] = useState(false);
  const [prizeErr, setPrizeErr] = useState("");
  const [prizeOk, setPrizeOk] = useState("");

  const loadLeaderboard = async () => {
    setErr("");
    setMsg("");

    const idNum = Number(matchId);
    if (!Number.isFinite(idNum)) {
      setErr("Enter a valid match ID");
      return;
    }

    try {
      setLoading(true);

      if (matchType === "tournament") {
        const res = await axios.get(
          `${API_BASE}/api/tournaments/${idNum}/admin/leaderboard`,
          { headers }
        );

        const normed = normalizeTournamentAdminData(res.data);
        setBoardType(normed.boardType);
        setTeams(normed.teams);

        const next = {};
        for (const t of normed.teams) next[keyOf(t)] = t.score ?? 0;
        setEditScore(next);

        setMsg(`Loaded ${normed.teams.length} rows`);
        return;
      }

      const res = await axios.get(`${API_BASE}/api/admin/leaderboard`, {
        headers,
        params: { match_type: matchType, match_id: idNum },
      });

      const normed = normalizeGenericAdminData(res.data, matchType);
      setBoardType(normed.boardType);
      setTeams(normed.teams);

      const next = {};
      for (const t of normed.teams) next[keyOf(t)] = t.score ?? 0;
      setEditScore(next);

      setMsg(`Loaded ${normed.teams.length} teams/groups (${normed.boardType})`);
    } catch (e2) {
      setErr(e2.response?.data?.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchBoard = async (e) => {
    e?.preventDefault?.();
    await loadLeaderboard();
  };

  const saveRowScore = async (t) => {
    setErr("");
    setMsg("");

    const idNum = Number(matchId);
    const k = keyOf(t);
    const scoreNum = Number(editScore[k]);

    if (!Number.isFinite(idNum)) return setErr("Enter a valid match ID");
    if (!Number.isFinite(scoreNum)) return setErr("Score must be a number");

    try {
      setSaving((s) => ({ ...s, [k]: true }));

      if (matchType === "tournament") {
        if (t._row_type === "solo") {
          await axios.put(
            `${API_BASE}/api/tournaments/${idNum}/admin/leaderboard/score`,
            { user_id: t.user_id, score: scoreNum },
            { headers }
          );
        } else {
          if (!t.team_id) throw new Error("Missing team_id for team row");
          await axios.put(
            `${API_BASE}/api/tournaments/${idNum}/admin/leaderboard/score`,
            { team_id: t.team_id, score: scoreNum },
            { headers }
          );
        }
        await loadLeaderboard();
        setMsg("Score saved");
        return;
      }

      if (t.group_no == null && t.team_id == null) {
        return setErr("This row has no group_no/team_id. Cannot save.");
      }

      await axios.put(
        `${API_BASE}/api/admin/leaderboard/score`,
        {
          match_type: matchType,
          match_id: idNum,
          group_no: t.group_no ?? null,
          team_id: t.team_id ?? null,
          score: scoreNum,
        },
        { headers }
      );

      await loadLeaderboard();
      setMsg("Score saved");
    } catch (e) {
      setErr(e.response?.data?.message || e.message || "Failed to save score");
    } finally {
      setSaving((s) => ({ ...s, [k]: false }));
    }
  };

  const doBulkClear = () => {
    const next = {};
    for (const t of teams) next[keyOf(t)] = 0;
    setEditScore(next);
    setMsg("All scores cleared (not saved yet)");
  };

  const doBulkSaveAll = async () => {
    setErr("");
    setMsg("");
    const idNum = Number(matchId);
    if (!Number.isFinite(idNum)) return setErr("Enter a valid match ID");

    try {
      for (const t of teams) {
        const k = keyOf(t);
        const scoreNum = Number(editScore[k]);
        if (!Number.isFinite(scoreNum)) continue;
        await saveRowScore(t);
      }
      setMsg("Saved all scores");
    } catch (e) {
      setErr(e.message || "Failed to save all");
    }
  };

  const getRowBg = (t) => {
    const total = guessTotalSlots({ matchType, boardType, teamRow: t });
    const players = safeArr(t.players);
    const filled = filledCount(players);

    if (total <= 1) return "rgba(34,197,94,0.06)";
    if (filled >= total) return "rgba(34,197,94,0.10)";
    if (filled > 0) return "rgba(245,158,11,0.10)";
    return "rgba(239,68,68,0.10)";
  };

  const getStatusIcon = (t) => {
    const total = guessTotalSlots({ matchType, boardType, teamRow: t });
    const players = safeArr(t.players);
    const filled = filledCount(players);

    if (total <= 1) return "✅";
    if (filled >= total) return "✅";
    if (filled > 0) return "🟡";
    return "🔴";
  };

  const openPrizeModal = (row, displayPlayers) => {
    setPrizeErr("");
    setPrizeOk("");
    setPrizeRow({ ...row, players: displayPlayers });

    setPrizeAmountTotal("");
    setPrizeNote(`Prize payout for rank ${row.rank}`);
    setPrizeMode("split");
    setPrizePerUser({});

    setPrizeOpen(true);
  };

  const closePrizeModal = () => {
    setPrizeOpen(false);
    setPrizeRow(null);
    setPrizeAmountTotal("");
    setPrizeNote("");
    setPrizeMode("split");
    setPrizePerUser({});
    setPrizeErr("");
    setPrizeOk("");
    setPrizeSending(false);
  };

  const computeWinnersForRow = (row) => {
    const totalSlots = guessTotalSlots({ matchType, boardType, teamRow: row });

    // We should only pay actual joined players (not empty slots)
    const players = safeArr(row?.players);
    const filtered = players.filter((p) => !p?._empty && (p?.user_id || p?.username || p?.player_game_id));

    // For solo rows, just 1 winner user_id
    if (totalSlots <= 1 || row?._row_type === "solo") return filtered.slice(0, 1);

    // For duo/squad, return all present members (up to totalSlots)
    return filtered.slice(0, totalSlots);
  };

  const submitPrize = async () => {
    setPrizeErr("");
    setPrizeOk("");

    const idNum = Number(matchId);
    if (!Number.isFinite(idNum)) {
      setPrizeErr("Match ID invalid");
      return;
    }

    if (!prizeRow || !isTop3(prizeRow.rank)) {
      setPrizeErr("Prize can be paid only for rank 1/2/3");
      return;
    }

    const winners = computeWinnersForRow(prizeRow);
    if (!winners.length) {
      setPrizeErr("No players found in this row");
      return;
    }

    // Must have user_id for payout
    const missing = winners.filter((p) => !p.user_id);
    if (missing.length) {
      setPrizeErr("Some players are missing user_id. Cannot pay prize to them.");
      return;
    }

    try {
      setPrizeSending(true);

      // Build payouts array
      let payouts = [];

      if (prizeMode === "split") {
        const total = moneyToNumber(prizeAmountTotal);
        if (!Number.isFinite(total) || total <= 0) {
          setPrizeErr("Enter a valid total prize amount");
          return;
        }

        const per = Math.floor((total / winners.length) * 100) / 100;
        if (per <= 0) {
          setPrizeErr("Prize per member is 0. Increase total amount.");
          return;
        }

        payouts = winners.map((p) => ({
          user_id: p.user_id,
          amount: per,
        }));
      } else {
        // manual
        payouts = winners.map((p) => ({
          user_id: p.user_id,
          amount: moneyToNumber(prizePerUser[p.user_id]),
        }));

        const bad = payouts.filter((x) => !Number.isFinite(x.amount) || x.amount <= 0);
        if (bad.length) {
          setPrizeErr("Enter valid amount for each member");
          return;
        }
      }

      // Call backend (to be added)
      await axios.post(
        `${API_BASE}/api/admin/prizes/credit`,
        {
          match_type: matchType,
          match_id: idNum,
          rank: Number(prizeRow.rank),
          // team context (optional, useful for audit)
          team_id: prizeRow.team_id ?? null,
          group_no: prizeRow.group_no ?? null,
          payouts, // [{user_id, amount}]
          note: (prizeNote || "").trim(),
        },
        { headers }
      );

      setPrizeOk("Prize credited successfully.");
      await loadLeaderboard();
    } catch (e) {
      setPrizeErr(e?.response?.data?.message || "Failed to pay prize");
    } finally {
      setPrizeSending(false);
    }
  };

  return (
    <div style={pageBase}>
      <div style={container}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>
          Admin – Leaderboard & Score Update
        </h1>
        <div style={{ marginTop: 6, opacity: 0.85, fontSize: 13 }}>
          Load match → edit scores → save → pay prize (rank 1–3).
        </div>

        {err && (
          <div
            style={{
              marginTop: 14,
              padding: 10,
              borderRadius: 8,
              background: "#fee2e2",
              color: "#7f1d1d",
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}
        {msg && (
          <div
            style={{
              marginTop: 14,
              padding: 10,
              borderRadius: 8,
              background: "#dcfce7",
              color: "#14532d",
              fontSize: 13,
            }}
          >
            {msg}
          </div>
        )}

        <div style={{ ...card, marginTop: 16 }}>
          <form onSubmit={fetchBoard}>
            <div style={row3}>
              <div>
                <div style={label}>Match Type</div>
                <select
                  style={inputStyle}
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value)}
                >
                  <option value="tournament">Tournament (BR)</option>
                  <option value="b2b">B2B</option>
                  <option value="cs">CS</option>
                  <option value="headshot">Headshot</option>
                </select>
              </div>

              <div>
                <div style={label}>Match ID</div>
                <input
                  style={inputStyle}
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                  placeholder="e.g. 24"
                />
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <button type="submit" style={btnPrimary} disabled={loading}>
                  {loading ? "Loading..." : "Load"}
                </button>
                <button
                  type="button"
                  style={btnGhost}
                  onClick={() => {
                    setTeams([]);
                    setEditScore({});
                    setErr("");
                    setMsg("");
                    setMatchId("");
                    setBoardType("");
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            {teams.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" style={btnSecondary} onClick={doBulkClear}>
                  Clear all (UI)
                </button>
                <button type="button" style={btnPrimary} onClick={doBulkSaveAll}>
                  Save all
                </button>
              </div>
            )}
          </form>

          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Status</th>
                <th style={th}>Rank</th>
                <th style={th}>Group/Team</th>
                <th style={th}>Players</th>
                <th style={th}>Score</th>
                <th style={th}>Action</th>
              </tr>
            </thead>

            <tbody>
              {teams.length === 0 ? (
                <tr>
                  <td style={td} colSpan={6}>
                    No data.
                  </td>
                </tr>
              ) : (
                teams.map((t) => {
                  const k = keyOf(t);
                  const title =
                    t._row_type === "solo"
                      ? t.team_name || `User ${t.user_id}`
                      : t.team_name ||
                        (t.team_id != null ? `Team ${t.team_id}` : `Group ${t.group_no}`);

                  const subtitle =
                    t._row_type === "solo"
                      ? `user_id: ${t.user_id}`
                      : t.team_id != null
                      ? `team_id: ${t.team_id} • group_no: ${t.group_no ?? "—"}`
                      : `group_no: ${t.group_no}`;

                  const total = guessTotalSlots({ matchType, boardType, teamRow: t });

                  let displayPlayers;

                  if (matchType === "tournament" && t._row_type === "team") {
                    displayPlayers = ensureSlots(t.players, total);
                  } else if (matchType === "b2b") {
                    displayPlayers = ensureSlots(t.players, total);
                  } else if (matchType === "cs") {
                    displayPlayers = ensureSlots(t.players, total);
                  } else if (matchType === "headshot") {
                    displayPlayers = ensureSlots(t.players, total);
                  } else {
                    displayPlayers = safeArr(t.players);
                  }

                  const filled = filledCount(displayPlayers);
                  const top3 = isTop3(t.rank);

                  return (
                    <tr key={k} style={{ background: getRowBg({ ...t, players: displayPlayers }) }}>
                      <td style={td}>{getStatusIcon({ ...t, players: displayPlayers })}</td>

                      <td style={td}>
                        <div style={{ fontWeight: 900 }}>{t.rank ?? "—"}</div>
                        {top3 ? <div style={{ marginTop: 6, ...pill, display: "inline-flex" }}>Prize</div> : null}
                      </td>

                      <td style={td}>
                        <div style={{ fontWeight: 900 }}>{title}</div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>{subtitle}</div>
                        {total > 1 && (
                          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                            {filled}/{total} filled
                          </div>
                        )}
                      </td>

                      <td style={td}>
                        {displayPlayers.length ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {displayPlayers.map((p, idx) => (
                              <div key={`${k}-p-${idx}`}>
                                <div style={{ fontWeight: 800 }}>
                                  {p.slot_no ? `${p.slot_no}. ` : ""}
                                  {p.username || p.name || (p._empty ? "Empty slot" : "—")}
                                </div>
                                <div style={{ fontSize: 12, opacity: 0.85 }}>
                                  ID: {p.player_game_id || p.game_id || "—"}
                                  {p.user_id ? ` • user_id: ${p.user_id}` : " • user_id: —"}
                                  {p.is_team_leader ? " • Leader" : ""}
                                  {p.team_side ? ` • Team ${p.team_side}` : ""}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td style={td}>
                        <input
                          style={{ ...inputStyle, width: 120, padding: "7px 10px" }}
                          type="number"
                          value={editScore[k] ?? 0}
                          onChange={(e) => setEditScore((s) => ({ ...s, [k]: e.target.value }))}
                        />
                      </td>

                      <td style={td}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            style={btnPrimary}
                            disabled={!!saving[k]}
                            onClick={() => saveRowScore(t)}
                          >
                            {saving[k] ? "Saving..." : "Save"}
                          </button>

                          {top3 ? (
                            <button
                              type="button"
                              style={btnSecondary}
                              onClick={() => openPrizeModal(t, displayPlayers)}
                              title="Credit prize to winners"
                            >
                              Pay prize
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prize Modal */}
      {prizeOpen && prizeRow ? (
        <div style={modalOverlay} onClick={closePrizeModal}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>
                  Pay Prize • Rank {prizeRow.rank}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  match_type: {matchType} • match_id: {matchId}
                </div>
              </div>
              <button type="button" style={btnGhost} onClick={closePrizeModal}>
                Close
              </button>
            </div>

            <div style={modalBody}>
              {prizeErr ? (
                <div
                  style={{
                    marginBottom: 12,
                    padding: 10,
                    borderRadius: 10,
                    background: "rgba(239,68,68,0.14)",
                    border: "1px solid rgba(239,68,68,0.28)",
                    color: "#fecaca",
                    fontSize: 13,
                  }}
                >
                  {prizeErr}
                </div>
              ) : null}

              {prizeOk ? (
                <div
                  style={{
                    marginBottom: 12,
                    padding: 10,
                    borderRadius: 10,
                    background: "rgba(34,197,94,0.14)",
                    border: "1px solid rgba(34,197,94,0.28)",
                    color: "#dcfce7",
                    fontSize: 13,
                  }}
                >
                  {prizeOk}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={pill}>
                  Winners: {computeWinnersForRow(prizeRow).length}
                </div>
                <div style={pill}>
                  Mode: {boardType || "—"}
                </div>
                <div style={pill}>
                  Team: {prizeRow.team_id ?? "—"} / Group: {prizeRow.group_no ?? "—"}
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={label}>Payout method</div>
                  <select
                    style={inputStyle}
                    value={prizeMode}
                    onChange={(e) => setPrizeMode(e.target.value)}
                  >
                    <option value="split">Split equally (enter total)</option>
                    <option value="manual">Manual per member</option>
                  </select>
                </div>

                <div>
                  <div style={label}>Note (optional)</div>
                  <input
                    style={inputStyle}
                    value={prizeNote}
                    onChange={(e) => setPrizeNote(e.target.value)}
                    placeholder="e.g. Prize payout"
                    maxLength={140}
                  />
                </div>
              </div>

              <div style={{ height: 12 }} />

              {prizeMode === "split" ? (
                <div>
                  <div style={label}>Total team prize amount (₹)</div>
                  <input
                    style={inputStyle}
                    type="number"
                    value={prizeAmountTotal}
                    onChange={(e) => setPrizeAmountTotal(e.target.value)}
                    placeholder="e.g. 500"
                  />
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                    This will split equally between all available members in this row.
                  </div>
                </div>
              ) : (
                <div>
                  <div style={label}>Manual amounts per member (₹)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {computeWinnersForRow(prizeRow).map((p) => (
                      <div key={`amt-${p.user_id}`} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(148,163,184,0.16)", background: "rgba(15,23,42,0.45)" }}>
                        <div style={{ fontWeight: 900, fontSize: 13 }}>
                          {p.username || "Player"} {p.slot_no ? `(slot ${p.slot_no})` : ""}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                          user_id: {p.user_id ?? "—"} • game_id: {p.player_game_id || "—"}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <input
                            style={inputStyle}
                            type="number"
                            value={prizePerUser[p.user_id] ?? ""}
                            onChange={(e) =>
                              setPrizePerUser((s) => ({ ...s, [p.user_id]: e.target.value }))
                            }
                            placeholder="Amount"
                            disabled={!p.user_id}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ height: 14 }} />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                <button type="button" style={btnGhost} onClick={closePrizeModal} disabled={prizeSending}>
                  Cancel
                </button>
                <button
                  type="button"
                  style={{
                    ...btnPrimary,
                    opacity: prizeSending ? 0.75 : 1,
                    cursor: prizeSending ? "not-allowed" : "pointer",
                  }}
                  onClick={submitPrize}
                  disabled={prizeSending}
                >
                  {prizeSending ? "Paying..." : "Confirm & Pay"}
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                Backend should prevent double payout using a transaction and a unique “prize key” check (we’ll add next).
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}