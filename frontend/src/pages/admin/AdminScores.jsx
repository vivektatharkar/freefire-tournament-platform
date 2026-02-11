// src/pages/AdminScores.js
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

const container = { maxWidth: 980, margin: "0 auto" };

const card = {
  background: "rgba(15,23,42,0.98)",
  borderRadius: 20,
  padding: 16,
  boxShadow: "0 14px 32px rgba(0,0,0,0.7)",
  border: "1px solid rgba(148,163,184,0.15)",
};

const label = {
  fontSize: 12,
  marginBottom: 4,
  color: "rgba(226,232,240,0.9)",
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
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
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const btnDanger = {
  padding: "9px 14px",
  borderRadius: 999,
  border: "none",
  backgroundImage: "linear-gradient(90deg,#fb7185,#ef4444)",
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

const btnChip = (active) => ({
  padding: "7px 11px",
  borderRadius: 999,
  border: active ? "1px solid rgba(56,189,248,0.9)" : "1px solid rgba(148,163,184,0.35)",
  background: active ? "rgba(56,189,248,0.12)" : "rgba(2,6,23,0.0)",
  color: active ? "#7dd3fc" : "rgba(226,232,240,0.9)",
  fontSize: 12,
  cursor: "pointer",
});

const row = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const row3 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 10,
};

function safeNum(v) {
  if (v === "" || v === null || typeof v === "undefined") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function copyToClipboard(text) {
  try {
    navigator.clipboard.writeText(String(text));
  } catch (e) {
    // ignore
  }
}

export default function AdminScores() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-store", // helps avoid cached admin API responses [web:1561]
      Pragma: "no-cache",
    }),
    [token]
  );

  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // Mode switch: "player" uses /solo; "b2bteam" uses /team
  const [mode, setMode] = useState("player");

  const [solo, setSolo] = useState({
    type: "br",
    match_id: "",
    user_id: "",
    score: "",
    match_status: "",
  });

  const [team, setTeam] = useState({
    tournament_id: "",
    team_id: "",
    group_no: "",
    score: "",
    team_name: "",
  });

  const [savingSolo, setSavingSolo] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);

  const onSoloChange = (e) => {
    const { name, value } = e.target;
    setSolo((s) => ({ ...s, [name]: value }));
  };

  const onTeamChange = (e) => {
    const { name, value } = e.target;
    setTeam((s) => ({ ...s, [name]: value }));
  };

  const resetSolo = () =>
    setSolo({
      type: "br",
      match_id: "",
      user_id: "",
      score: "",
      match_status: "",
    });

  const resetTeam = () =>
    setTeam({
      tournament_id: "",
      team_id: "",
      group_no: "",
      score: "",
      team_name: "",
    });

  const quickSetType = (t) => {
    setSolo((s) => ({ ...s, type: t }));
    if (t === "b2b") setMode("b2bteam");
    else setMode("player");
  };

  const saveSolo = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");

    if (!token) {
      setError("Token missing. Login again.");
      return;
    }

    const matchId = safeNum(solo.match_id);
    const userId = safeNum(solo.user_id);
    const score = safeNum(solo.score) ?? 0;

    if (!matchId) return setError("Match ID is required.");
    if (!userId) return setError("User ID is required.");

    const payload = {
      type: solo.type,
      match_id: matchId,
      user_id: userId,
      score,
    };

    if (String(solo.match_status || "").trim() !== "") {
      payload.match_status = String(solo.match_status).trim();
    }

    try {
      setSavingSolo(true);
      const res = await axios.put(
        "http://localhost:5000/api/admin/scores/solo",
        payload,
        { headers }
      );
      setMsg(res.data?.message || "Solo score updated");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update solo score");
    } finally {
      setSavingSolo(false);
    }
  };

  const saveTeam = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");

    if (!token) {
      setError("Token missing. Login again.");
      return;
    }

    const tournamentId = safeNum(team.tournament_id);
    if (!tournamentId) return setError("Tournament ID is required.");

    const payload = {
      tournament_id: tournamentId,
      score: safeNum(team.score) ?? 0,
    };

    const teamId = safeNum(team.team_id);
    const groupNo = safeNum(team.group_no);

    if (!teamId && !groupNo) {
      return setError("Provide Team ID OR Group No.");
    }
    if (teamId) payload.team_id = teamId;
    if (groupNo) payload.group_no = groupNo;

    const tName = String(team.team_name || "").trim();
    if (tName !== "") payload.team_name = tName;

    try {
      setSavingTeam(true);
      const res = await axios.put(
        "http://localhost:5000/api/admin/scores/team",
        payload,
        { headers }
      );
      setMsg(res.data?.message || "Team score updated");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update team score");
    } finally {
      setSavingTeam(false);
    }
  };

  const soloPayloadPreview = useMemo(() => {
    const p = {
      type: solo.type,
      match_id: safeNum(solo.match_id),
      user_id: safeNum(solo.user_id),
      score: safeNum(solo.score) ?? 0,
    };
    if (String(solo.match_status || "").trim() !== "") {
      p.match_status = String(solo.match_status).trim();
    }
    return p;
  }, [solo]);

  const teamPayloadPreview = useMemo(() => {
    const p = {
      tournament_id: safeNum(team.tournament_id),
      score: safeNum(team.score) ?? 0,
    };
    const teamId = safeNum(team.team_id);
    const groupNo = safeNum(team.group_no);
    if (teamId) p.team_id = teamId;
    if (groupNo) p.group_no = groupNo;
    const tName = String(team.team_name || "").trim();
    if (tName) p.team_name = tName;
    return p;
  }, [team]);

  return (
    <div style={pageBase}>
      <div style={container}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Admin – Scores</h1>
        <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
          Easier score updates (same backend APIs).
        </div>

        {error && (
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
            {error}
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

        {/* MODE SWITCH */}
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Quick mode</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                Choose what you want to update.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" style={btnChip(mode === "player")} onClick={() => setMode("player")}>
                Player score
              </button>
              <button type="button" style={btnChip(mode === "b2bteam")} onClick={() => setMode("b2bteam")}>
                B2B team score
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={btnChip(solo.type === "br")} onClick={() => quickSetType("br")}>
              BR
            </button>
            <button type="button" style={btnChip(solo.type === "cs")} onClick={() => quickSetType("cs")}>
              CS
            </button>
            <button type="button" style={btnChip(solo.type === "headshot")} onClick={() => quickSetType("headshot")}>
              Headshot
            </button>
            <button type="button" style={btnChip(solo.type === "b2b")} onClick={() => quickSetType("b2b")}>
              B2B
            </button>
          </div>
        </div>

        {/* SOLO SCORE */}
        {mode === "player" && (
          <div style={{ ...card, marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>Player score</h3>
                <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                  API: PUT /api/admin/scores/solo
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  style={btnGhost}
                  onClick={() => copyToClipboard(JSON.stringify(soloPayloadPreview, null, 2))}
                >
                  Copy payload
                </button>
                <button type="button" style={btnDanger} onClick={resetSolo}>
                  Clear
                </button>
              </div>
            </div>

            <form onSubmit={saveSolo} style={{ marginTop: 12 }}>
              <div style={row3}>
                <div>
                  <div style={label}>Type</div>
                  <select style={inputStyle} name="type" value={solo.type} onChange={onSoloChange}>
                    <option value="br">BR</option>
                    <option value="cs">CS</option>
                    <option value="headshot">Headshot</option>
                    <option value="b2b">B2B (player row)</option>
                  </select>
                </div>

                <div>
                  <div style={label}>Match ID</div>
                  <input
                    style={inputStyle}
                    type="number"
                    name="match_id"
                    value={solo.match_id}
                    onChange={onSoloChange}
                    placeholder="e.g. 12"
                    required
                  />
                </div>

                <div>
                  <div style={label}>User ID</div>
                  <input
                    style={inputStyle}
                    type="number"
                    name="user_id"
                    value={solo.user_id}
                    onChange={onSoloChange}
                    placeholder="e.g. 44"
                    required
                  />
                </div>
              </div>

              <div style={{ ...row, marginTop: 10 }}>
                <div>
                  <div style={label}>Score</div>
                  <input
                    style={inputStyle}
                    type="number"
                    name="score"
                    value={solo.score}
                    onChange={onSoloChange}
                    placeholder="0"
                  />
                </div>

                <div>
                  <div style={label}>Match status (optional)</div>
                  <input
                    style={inputStyle}
                    name="match_status"
                    value={solo.match_status}
                    onChange={onSoloChange}
                    placeholder="winner / lose / etc."
                  />
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="submit" style={btnPrimary} disabled={savingSolo}>
                  {savingSolo ? "Saving..." : "Save player score"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TEAM SCORE */}
        {mode === "b2bteam" && (
          <div style={{ ...card, marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>B2B team score</h3>
                <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                  API: PUT /api/admin/scores/team
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  style={btnGhost}
                  onClick={() => copyToClipboard(JSON.stringify(teamPayloadPreview, null, 2))}
                >
                  Copy payload
                </button>
                <button type="button" style={btnDanger} onClick={resetTeam}>
                  Clear
                </button>
              </div>
            </div>

            <form onSubmit={saveTeam} style={{ marginTop: 12 }}>
              <div style={row}>
                <div>
                  <div style={label}>Tournament ID</div>
                  <input
                    style={inputStyle}
                    type="number"
                    name="tournament_id"
                    value={team.tournament_id}
                    onChange={onTeamChange}
                    placeholder="e.g. 5"
                    required
                  />
                </div>

                <div>
                  <div style={label}>Score</div>
                  <input
                    style={inputStyle}
                    type="number"
                    name="score"
                    value={team.score}
                    onChange={onTeamChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={{ ...row, marginTop: 10 }}>
                <div>
                  <div style={label}>Group No (recommended)</div>
                  <input
                    style={inputStyle}
                    type="number"
                    name="group_no"
                    value={team.group_no}
                    onChange={onTeamChange}
                    placeholder="e.g. 1..12 (squad) / 1..24 (duo)"
                  />
                </div>

                <div>
                  <div style={label}>Team ID (optional)</div>
                  <input
                    style={inputStyle}
                    type="number"
                    name="team_id"
                    value={team.team_id}
                    onChange={onTeamChange}
                    placeholder="use team_id OR group_no"
                  />
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={label}>Team name (optional)</div>
                <input
                  style={inputStyle}
                  name="team_name"
                  value={team.team_name}
                  onChange={onTeamChange}
                  placeholder="optional"
                />
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="submit" style={btnPrimary} disabled={savingTeam}>
                  {savingTeam ? "Saving..." : "Save team score"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}