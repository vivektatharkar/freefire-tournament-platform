// src/pages/AdminSupportInbox.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminSupportInbox() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token") || "";
  const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [statusFilter, setStatusFilter] = useState("all");
  const [tickets, setTickets] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  const [thread, setThread] = useState({ ticket: null, messages: [] });
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // prevent multiple auto-status calls for the same ticket selection
  const autoMarkedRef = useRef(new Set());

  const styles = useMemo(
    () => ({
      page: {
        minHeight: "100vh",
        padding: 16,
        background:
          "radial-gradient(1000px 500px at 10% 5%, rgba(56,189,248,0.10), transparent 50%), radial-gradient(900px 500px at 90% 20%, rgba(34,197,94,0.10), transparent 55%), linear-gradient(180deg, #020617, #01040e)",
        color: "#e5e7eb",
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      },
      container: { maxWidth: 1200, margin: "0 auto" },

      header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 12,
      },
      titleWrap: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
      title: { margin: 0, fontSize: 20, letterSpacing: 0.2, fontWeight: 900 },
      backBtn: {
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "rgba(15,23,42,0.55)",
        color: "#cbd5e1",
        cursor: "pointer",
        fontWeight: 800,
      },

      filterRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
      select: {
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "rgba(15,23,42,0.65)",
        color: "#e5e7eb",
        outline: "none",
      },
      grid: { display: "grid", gridTemplateColumns: "360px 1fr", gap: 12 },
      panel: {
        borderRadius: 16,
        border: "1px solid rgba(148,163,184,0.16)",
        background: "rgba(2,6,23,0.55)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        overflow: "hidden",
      },
      listHeader: {
        padding: 12,
        borderBottom: "1px solid rgba(148,163,184,0.12)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
      },
      listBody: { maxHeight: "75vh", overflow: "auto" },

      ticketRow: (active) => ({
        padding: 12,
        cursor: "pointer",
        borderBottom: "1px solid rgba(148,163,184,0.10)",
        background: active ? "rgba(59,130,246,0.10)" : "transparent",
      }),
      ticketTop: { display: "flex", justifyContent: "space-between", gap: 10 },
      badge: (status) => ({
        fontSize: 11,
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid rgba(148,163,184,0.18)",
        background:
          status === "open"
            ? "rgba(34,197,94,0.12)"
            : status === "in_progress"
            ? "rgba(59,130,246,0.12)"
            : "rgba(148,163,184,0.10)",
        color:
          status === "open"
            ? "#bbf7d0"
            : status === "in_progress"
            ? "#bfdbfe"
            : "#cbd5e1",
        whiteSpace: "nowrap",
        fontWeight: 800,
        textTransform: "capitalize",
      }),
      ticketSub: { fontSize: 12, opacity: 0.85, marginTop: 6, lineHeight: 1.35 },

      threadHeader: {
        padding: 12,
        borderBottom: "1px solid rgba(148,163,184,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
      },
      threadTitle: { margin: 0, fontSize: 14, letterSpacing: 0.2, fontWeight: 900 },
      threadBody: { padding: 12, maxHeight: "62vh", overflow: "auto" },

      msg: (role) => ({
        maxWidth: "80%",
        marginBottom: 10,
        marginLeft: role === "admin" ? "auto" : 0,
        padding: 10,
        borderRadius: 14,
        border: "1px solid rgba(148,163,184,0.14)",
        background: role === "admin" ? "rgba(59,130,246,0.14)" : "rgba(15,23,42,0.55)",
        whiteSpace: "pre-wrap",
        lineHeight: 1.45,
      }),
      meta: { marginTop: 6, fontSize: 11, opacity: 0.7 },

      composer: {
        padding: 12,
        borderTop: "1px solid rgba(148,163,184,0.12)",
        display: "flex",
        gap: 10,
        alignItems: "flex-end",
      },
      textarea: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        resize: "vertical",
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "rgba(15,23,42,0.65)",
        color: "#e5e7eb",
        padding: "10px 12px",
        outline: "none",
      },
      btn: {
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(59,130,246,0.35)",
        background: "rgba(59,130,246,0.18)",
        color: "#bfdbfe",
        cursor: "pointer",
        fontWeight: 800,
      },
      smallBtn: {
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "rgba(15,23,42,0.55)",
        color: "#cbd5e1",
        cursor: "pointer",
        fontWeight: 800,
      },
      err: {
        marginTop: 10,
        padding: 10,
        borderRadius: 12,
        border: "1px solid rgba(239,68,68,0.28)",
        background: "rgba(239,68,68,0.10)",
        color: "#fecaca",
        fontSize: 13,
      },
      empty: { padding: 14, opacity: 0.75, fontSize: 13 },
      gridMobile: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },
    }),
    []
  );

  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;

  async function readApiError(res) {
    const txt = await res.text().catch(() => "");
    try {
      const j = txt ? JSON.parse(txt) : {};
      return j?.message || `Request failed (${res.status})`;
    } catch {
      return txt || `Request failed (${res.status})`;
    }
  }

  async function api(path, options = {}) {
    const headers = {
      ...(options.headers || {}),
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    return fetch(`${API}${path}`, { ...options, headers });
  }

  async function loadTickets({ keepActive = true } = {}) {
    if (!token) {
      setTickets([]);
      setActiveId(null);
      setError("Login required. Please login as admin again.");
      return;
    }

    setLoadingList(true);
    setError("");

    try {
      const qs =
        statusFilter && statusFilter !== "all"
          ? `?status=${encodeURIComponent(statusFilter)}`
          : "?status=all";

      const res = await api(`/api/admin/support/tickets${qs}`, { method: "GET" });

      if (!res.ok) {
        const msg = await readApiError(res);
        throw new Error(msg);
      }

      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data.tickets) ? data.tickets : [];

      setTickets(list);

      if (!keepActive) return;

      if (list.length === 0) {
        setActiveId(null);
        setThread({ ticket: null, messages: [] });
        return;
      }

      const exists = activeId && list.some((t) => t.id === activeId);
      if (!exists) setActiveId(list[0].id);
    } catch (e) {
      setTickets([]);
      setActiveId(null);
      setThread({ ticket: null, messages: [] });
      setError(e?.message || "Failed to load tickets");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadThread(id) {
    if (!token) return;
    if (!id) return;

    setLoadingThread(true);
    setError("");

    try {
      const res = await api(`/api/admin/support/tickets/${id}`, { method: "GET" });

      if (!res.ok) {
        const msg = await readApiError(res);
        throw new Error(msg);
      }

      const data = await res.json().catch(() => ({}));
      setThread({ ticket: data.ticket || null, messages: data.messages || [] });
      return data.ticket || null;
    } catch (e) {
      setThread({ ticket: null, messages: [] });
      setError(e?.message || "Failed to load thread");
      return null;
    } finally {
      setLoadingThread(false);
    }
  }

  async function setStatus(nextStatus, { silent = false } = {}) {
    if (!token || !activeId) return false;

    try {
      const res = await api(`/api/admin/support/tickets/${activeId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const msg = await readApiError(res);
        throw new Error(msg);
      }

      if (!silent) {
        await loadThread(activeId);
        await loadTickets({ keepActive: true });
      }
      return true;
    } catch (e) {
      if (!silent) setError(e?.message || "Failed to update status");
      return false;
    }
  }

  async function autoMarkInProgress(ticketObj) {
    // only: open -> in_progress, do not touch closed
    const t = ticketObj || thread.ticket;
    if (!t || !activeId) return;

    if (t.status !== "open") return;
    if (autoMarkedRef.current.has(activeId)) return;

    autoMarkedRef.current.add(activeId);

    // update UI fast (optimistic)
    setThread((prev) => ({
      ...prev,
      ticket: prev.ticket ? { ...prev.ticket, status: "in_progress" } : prev.ticket,
    }));

    // server update (silent refresh to keep flow smooth)
    await setStatus("in_progress", { silent: true });

    // refresh list so badge changes on left too
    await loadTickets({ keepActive: true });
  }

  async function sendReply() {
    setError("");
    if (!token) {
      setError("Login required.");
      return;
    }
    if (!activeId) return;
    if (!reply.trim()) return;

    try {
      setSending(true);

      // If ticket is open, mark in_progress first (no UI disruption)
      if (thread.ticket?.status === "open") {
        await autoMarkInProgress(thread.ticket);
      }

      const res = await api(`/api/admin/support/tickets/${activeId}/message`, {
        method: "POST",
        body: JSON.stringify({ message: reply.trim() }),
      });

      if (!res.ok) {
        const msg = await readApiError(res);
        throw new Error(msg);
      }

      setReply("");

      // After reply, ensure status is in_progress unless closed
      if (thread.ticket?.status !== "closed") {
        await setStatus("in_progress", { silent: true });
      }

      await loadThread(activeId);
      await loadTickets({ keepActive: true });
    } catch (e) {
      setError(e?.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    loadTickets({ keepActive: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (!activeId) return;

    (async () => {
      const ticketObj = await loadThread(activeId);

      // auto status update when admin opens a ticket: open -> in_progress
      if (ticketObj) await autoMarkInProgress(ticketObj);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // auto refresh list
  useEffect(() => {
    const t = setInterval(() => loadTickets({ keepActive: true }), 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, activeId, token]);

  const activeTicket = thread.ticket;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.titleWrap}>
            <button style={styles.backBtn} onClick={() => navigate("/admin")} type="button">
              ← Back
            </button>
            <h1 style={styles.title}>Admin Support Inbox</h1>
          </div>

          <div style={styles.filterRow}>
            <select
              style={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="closed">Closed</option>
            </select>

            <button
              style={styles.smallBtn}
              onClick={() => loadTickets({ keepActive: true })}
              disabled={loadingList}
              type="button"
            >
              {loadingList ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div style={isMobile ? styles.gridMobile : styles.grid}>
          {/* Left */}
          <div style={styles.panel}>
            <div style={styles.listHeader}>
              <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 800 }}>
                Tickets ({tickets.length})
              </div>
            </div>

            <div style={styles.listBody}>
              {loadingList ? (
                <div style={styles.empty}>Loading...</div>
              ) : tickets.length === 0 ? (
                <div style={styles.empty}>No tickets found.</div>
              ) : (
                tickets.map((t) => (
                  <div
                    key={t.id}
                    style={styles.ticketRow(t.id === activeId)}
                    onClick={() => setActiveId(t.id)}
                  >
                    <div style={styles.ticketTop}>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>
                        #{t.id} • {t.subject}
                      </div>
                      <div style={styles.badge(t.status)}>{t.status}</div>
                    </div>

                    <div style={styles.ticketSub}>
                      User: {t?.user?.name || `ID ${t.user_id}`}{" "}
                      {t?.user?.game_id ? `• Game: ${t.user.game_id}` : ""}
                      <br />
                      Updated:{" "}
                      {t.last_message_at ? new Date(t.last_message_at).toLocaleString() : "-"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right */}
          <div style={styles.panel}>
            <div style={styles.threadHeader}>
              <div>
                <div style={styles.threadTitle}>
                  {activeTicket
                    ? `Ticket #${activeTicket.id} • ${activeTicket.subject}`
                    : "Select a ticket"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  {activeTicket ? `Status: ${activeTicket.status}` : ""}
                </div>
              </div>

              {activeTicket ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={styles.smallBtn} onClick={() => setStatus("open")} type="button">
                    Open
                  </button>
                  <button style={styles.smallBtn} onClick={() => setStatus("in_progress")} type="button">
                    In progress
                  </button>
                  <button style={styles.smallBtn} onClick={() => setStatus("closed")} type="button">
                    Close
                  </button>
                </div>
              ) : null}
            </div>

            <div style={styles.threadBody}>
              {loadingThread ? (
                <div style={styles.empty}>Loading thread...</div>
              ) : !activeTicket ? (
                <div style={styles.empty}>Choose a ticket from the left.</div>
              ) : thread.messages.length === 0 ? (
                <div style={styles.empty}>No messages yet.</div>
              ) : (
                thread.messages.map((m) => (
                  <div key={m.id} style={styles.msg(m.sender_role)}>
                    {m.message}
                    <div style={styles.meta}>
                      {String(m.sender_role || "").toUpperCase()} •{" "}
                      {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                    </div>
                  </div>
                ))
              )}

              {error ? <div style={styles.err}>{error}</div> : null}
            </div>

            {activeTicket ? (
              <div style={styles.composer}>
                <textarea
                  style={styles.textarea}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type reply to user..."
                  maxLength={2000}
                  disabled={sending || activeTicket.status === "closed"}
                />
                <button
                  style={{
                    ...styles.btn,
                    opacity: sending || activeTicket.status === "closed" ? 0.65 : 1,
                    cursor: sending || activeTicket.status === "closed" ? "not-allowed" : "pointer",
                  }}
                  onClick={sendReply}
                  disabled={sending || activeTicket.status === "closed"}
                  type="button"
                >
                  {activeTicket.status === "closed" ? "Closed" : sending ? "Sending..." : "Send"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}