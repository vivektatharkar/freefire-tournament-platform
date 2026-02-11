// frontend/src/pages/admin/AdminTournamentsHeadshot.jsx
import React, { useEffect, useState, useContext, useCallback } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";

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

const container = { maxWidth: 1200, margin: "0 auto" };

const headerRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 20,
};

const titleStyle = { fontSize: 26, fontWeight: 800, margin: 0 };

const walletBox = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 16px",
  borderRadius: 999,
  background: "rgba(15,23,42,0.95)",
  border: "1px solid rgba(148,163,184,0.4)",
};

const bellDot = {
  width: 22,
  height: 22,
  borderRadius: 999,
  background: "#fbbf24",
};

const flexRow = {
  display: "flex",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const cardBase = {
  background: "rgba(15,23,42,0.98)",
  borderRadius: 20,
  padding: 16,
  boxShadow: "0 14px 32px rgba(0,0,0,0.7)",
};

const formCard = { ...cardBase, maxWidth: 420, flex: "0 0 360px" };
const listCard = { ...cardBase, flex: 1, minWidth: 320 };

const label = {
  fontSize: 12,
  marginBottom: 4,
  color: "rgba(226,232,240,0.9)",
};

const inputStyle = {
  width: "100%",
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.5)",
  background: "rgba(15,23,42,0.95)",
  color: "#e5e7eb",
  fontSize: 13,
  outline: "none",
};

const selectStyle = { ...inputStyle };
const textarea = { ...inputStyle, minHeight: 80, resize: "vertical" };

const btnPrimary = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "none",
  backgroundImage: "linear-gradient(90deg,#38bdf8,#22c55e)",
  color: "#020617",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const btnGhost = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.6)",
  background: "transparent",
  color: "#e5e7eb",
  fontSize: 12,
  cursor: "pointer",
};

const btnDanger = {
  ...btnGhost,
  border: "1px solid rgba(248,113,113,0.9)",
  color: "#fecaca",
};

const smallText = { fontSize: 11, opacity: 0.85 };

const tagBase = {
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  textTransform: "uppercase",
};
const tagUpcoming = { ...tagBase, background: "#1d4ed8", color: "#e0f2fe" };
const tagLive = { ...tagBase, background: "#16a34a", color: "#dcfce7" };
const tagCompleted = { ...tagBase, background: "#4b5563", color: "#e5e7eb" };
const tagLocked = { ...tagBase, background: "#991b1b", color: "#fee2e2" };

const table = { width: "100%", borderCollapse: "collapse", marginTop: 8 };
const th = {
  fontSize: 11,
  padding: "6px 8px",
  textAlign: "left",
  borderBottom: "1px solid rgba(30,64,175,0.5)",
  color: "rgba(209,213,219,0.9)",
};
const td = {
  fontSize: 12,
  padding: "6px 8px",
  borderBottom: "1px solid rgba(15,23,42,0.9)",
};

const actionBtn = { ...btnGhost, padding: "4px 10px", fontSize: 11 };

function normalizeMode(mode) {
  const m = String(mode || "").trim().toLowerCase();
  if (m === "solo" || m === "duo" || m === "squad") return m;
  return "solo";
}

export default function AdminTournamentsHeadshot() {
  const { user, token } = useContext(AuthContext) || {};
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    mode: "solo", // FIX: controlled mode
    entry_fee: "",
    prize_pool: "",
    date: "",
    max_players: "",
    description: "",
    status: "upcoming",
  });

  const [roomModalId, setRoomModalId] = useState(null);
  const [roomForm, setRoomForm] = useState({ room_id: "", room_password: "" });

  const [playersModalId, setPlayersModalId] = useState(null);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [players, setPlayers] = useState([]);

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${token || localStorage.getItem("token")}`,
    }),
    [token]
  );

  const statusTag = (status) => {
    switch ((status || "").toLowerCase()) {
      case "live":
        return <span style={tagLive}>Live</span>;
      case "completed":
        return <span style={tagCompleted}>Completed</span>;
      case "locked":
        return <span style={tagLocked}>Locked</span>;
      default:
        return <span style={tagUpcoming}>Upcoming</span>;
    }
  };

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get("http://localhost:5000/api/admin/headshot", {
        headers: authHeaders(),
      });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load headshot matches.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    const tkn = token || localStorage.getItem("token");
    if (!tkn) {
      setError("Admin token missing. Please login again.");
      return;
    }
    loadMatches();
  }, [token, loadMatches]);

  const startCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      mode: "solo",
      entry_fee: "",
      prize_pool: "",
      date: "",
      max_players: "",
      description: "",
      status: "upcoming",
    });
  };

  const startEdit = (t) => {
    let dateValue = "";
    if (t.date && typeof t.date === "string") {
      if (t.date.includes("T")) dateValue = t.date.slice(0, 16);
      else if (t.date.includes(" ")) {
        const [d, time] = t.date.split(" ");
        dateValue = `${d}T${time.slice(0, 5)}`;
      }
    }

    setEditingId(t.id);
    setForm({
      name: t.name || "",
      mode: normalizeMode(t.mode), // FIX
      entry_fee: t.entry_fee || "",
      prize_pool: t.prize_pool || "",
      date: dateValue,
      max_players: t.slots || "",
      description: t.description || "",
      status: t.status || "upcoming",
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  // ALWAYS create a new headshot match on save
  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {
      name: form.name,
      mode: form.mode, // FIX: backend expects mode
      entry_fee: Number(form.entry_fee) || 0,
      prize_pool: Number(form.prize_pool) || 0,
      date: form.date,
      slots: Number(form.max_players) || 0,
      description: form.description,
      status: form.status,
    };

    try {
      setSaving(true);
      setError("");

      await axios.post("http://localhost:5000/api/admin/headshot", payload, {
        headers: authHeaders(),
      });

      setEditingId(null);
      startCreate();
      await loadMatches();
    } catch (e2) {
      setError(e2.response?.data?.message || "Failed to save headshot match.");
    } finally {
      setSaving(false);
    }
  };

  const toggleLock = async (t) => {
    const next = t.status === "locked" ? "upcoming" : "locked";
    try {
      await axios.patch(
        `http://localhost:5000/api/admin/headshot/${t.id}/status`,
        { status: next },
        { headers: authHeaders() }
      );
      setItems((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, status: next } : x))
      );
    } catch (e) {
      setError(e.response?.data?.message || "Failed to change status.");
    }
  };

  const deleteMatch = async (t) => {
    const ok = window.confirm(
      `Delete headshot match #${t.id}?

This will remove the match and its joined players (participations).`
    );
    if (!ok) return;

    try {
      setError("");
      await axios.delete(`http://localhost:5000/api/admin/headshot/${t.id}`, {
        headers: authHeaders(),
      });
      setItems((prev) => prev.filter((x) => x.id !== t.id));
      if (playersModalId === t.id) setPlayersModalId(null);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to delete headshot match.");
    }
  };

  const openRoomModal = (t) => {
    setRoomModalId(t.id);
    setRoomForm({
      room_id: t.room_id || "",
      room_password: t.room_password || "",
    });
  };

  const saveRoom = async () => {
    try {
      await axios.patch(
        `http://localhost:5000/api/admin/headshot/${roomModalId}/room`,
        roomForm,
        { headers: authHeaders() }
      );
      setItems((prev) =>
        prev.map((x) =>
          x.id === roomModalId
            ? {
                ...x,
                room_id: roomForm.room_id,
                room_password: roomForm.room_password,
              }
            : x
        )
      );
      setRoomModalId(null);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save room details.");
    }
  };

  const openPlayersModal = async (t) => {
    try {
      setPlayersModalId(t.id);
      setPlayersLoading(true);
      setPlayers([]);
      const res = await axios.get(
        `http://localhost:5000/api/admin/headshot/${t.id}/players`,
        { headers: authHeaders() }
      );
      setPlayers(res.data.players || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load players.");
    } finally {
      setPlayersLoading(false);
    }
  };

  const renderDate = (raw) => {
    if (!raw) return "-";
    if (typeof raw === "string") {
      if (raw.includes("T")) return raw.replace("T", " ").slice(0, 16);
      if (raw.includes(" ")) return raw.slice(0, 16);
    }
    return String(raw);
  };

  return (
    <div style={pageBase}>
      <div style={container}>
        <div style={headerRow}>
          <h1 style={titleStyle}>Admin – Headshot Tournaments</h1>
          <div style={walletBox}>
            <div style={bellDot} />
            <span style={{ fontSize: 13 }}>Wallet balance</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              ₹{user?.wallet_balance ?? 0}
            </span>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 14,
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

        <div style={flexRow}>
          {/* FORM */}
          <div style={formCard}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16 }}>
                {editingId ? "Edit (creates new match)" : "Add new match"}
              </h3>
              {editingId && (
                <button style={btnGhost} type="button" onClick={startCreate}>
                  Cancel edit
                </button>
              )}
            </div>

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 8 }}>
                <div style={label}>Title / Name</div>
                <input
                  style={inputStyle}
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={label}>Mode (Solo/Duo/Squad)</div>
                <select
                  style={selectStyle}
                  name="mode"
                  value={form.mode}
                  onChange={handleFormChange}
                >
                  <option value="solo">Solo</option>
                  <option value="duo">Duo</option>
                  <option value="squad">Squad</option>
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <div style={label}>Entry fee (₹)</div>
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    name="entry_fee"
                    value={form.entry_fee}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div>
                  <div style={label}>Prize pool (₹)</div>
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    name="prize_pool"
                    value={form.prize_pool}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={label}>Match time & date</div>
                <input
                  style={inputStyle}
                  type="datetime-local"
                  name="date"
                  value={form.date}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={label}>Max players (slots)</div>
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  name="max_players"
                  value={form.max_players}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={label}>Status</div>
                <select
                  style={selectStyle}
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={label}>Description</div>
                <textarea
                  style={textarea}
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Rules, rewards, etc."
                />
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button type="submit" style={btnPrimary} disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save (create new)"
                    : "Create match"}
                </button>
              </div>
            </form>
          </div>

          {/* LIST */}
          <div style={listCard}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16 }}>Headshot matches</h3>
              <span style={smallText}>
                {loading ? "Loading…" : `${items.length} total`}
              </span>
            </div>

            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>Name</th>
                  <th style={th}>Mode</th>
                  <th style={th}>Entry</th>
                  <th style={th}>Prize</th>
                  <th style={th}>Players</th>
                  <th style={th}>Time</th>
                  <th style={th}>Status</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id}>
                    <td style={td}>{t.id}</td>
                    <td style={td}>{t.name}</td>
                    <td style={td}>{(t.mode || "-").toString()}</td>
                    <td style={td}>₹{t.entry_fee}</td>
                    <td style={td}>₹{t.prize_pool}</td>
                    <td style={td}>
                      {t.joined_count || 0}/{t.slots || 0}
                    </td>
                    <td style={td}>
                      <div style={smallText}>{renderDate(t.date)}</div>
                    </td>
                    <td style={td}>{statusTag(t.status)}</td>
                    <td style={td}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        <button
                          style={actionBtn}
                          type="button"
                          onClick={() => startEdit(t)}
                        >
                          Edit (new)
                        </button>
                        <button
                          style={actionBtn}
                          type="button"
                          onClick={() => openRoomModal(t)}
                        >
                          Room
                        </button>
                        <button
                          style={actionBtn}
                          type="button"
                          onClick={() => openPlayersModal(t)}
                        >
                          Players
                        </button>
                        <button
                          style={actionBtn}
                          type="button"
                          onClick={() => toggleLock(t)}
                        >
                          {t.status === "locked" ? "Unlock" : "Lock"}
                        </button>
                        <button
                          style={{ ...btnDanger, padding: "4px 10px", fontSize: 11 }}
                          type="button"
                          onClick={() => deleteMatch(t)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && items.length === 0 && (
                  <tr>
                    <td style={td} colSpan={10}>
                      No headshot matches yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ROOM MODAL */}
      {roomModalId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
          }}
        >
          <div style={{ ...cardBase, maxWidth: 420, width: "90%" }}>
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>
              Room details
            </h3>
            <div style={{ marginBottom: 8 }}>
              <div style={label}>Room ID</div>
              <input
                style={inputStyle}
                value={roomForm.room_id}
                onChange={(e) =>
                  setRoomForm((s) => ({ ...s, room_id: e.target.value }))
                }
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={label}>Password</div>
              <input
                style={inputStyle}
                value={roomForm.room_password}
                onChange={(e) =>
                  setRoomForm((s) => ({ ...s, room_password: e.target.value }))
                }
              />
            </div>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                style={btnGhost}
                type="button"
                onClick={() => setRoomModalId(null)}
              >
                Close
              </button>
              <button style={btnPrimary} type="button" onClick={saveRoom}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYERS MODAL */}
      {playersModalId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
          }}
        >
          <div style={{ ...cardBase, maxWidth: 520, width: "95%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16 }}>Players</h3>
              <button
                style={btnGhost}
                type="button"
                onClick={() => setPlayersModalId(null)}
              >
                Close
              </button>
            </div>
            {playersLoading ? (
              <div style={{ fontSize: 13 }}>Loading players…</div>
            ) : players.length === 0 ? (
              <div style={{ fontSize: 13 }}>No players joined yet.</div>
            ) : (
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>ID</th>
                    <th style={th}>Name</th>
                    <th style={th}>Free Fire ID</th>
                    <th style={th}>Contact</th>
                    <th style={th}>Team</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.id}>
                      <td style={td}>{p.id}</td>
                      <td style={td}>{p.name || "-"}</td>
                      <td style={td}>{p.freefireId || "-"}</td>
                      <td style={td}>{p.phone || p.email || "-"}</td>
                      <td style={td}>{p.team_side || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}