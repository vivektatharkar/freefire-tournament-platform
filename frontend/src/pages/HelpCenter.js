// frontend/src/pages/HelpCenter.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function HelpCenter() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/home");
  };

  // -------- Support badge/modal state --------
  const [supportOpen, setSupportOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [error, setError] = useState("");

  const isNarrow = typeof window !== "undefined" && window.innerWidth < 860;

  // -------- My Tickets + Chat (kept for chat modal + unread badge) --------
  const [myTickets, setMyTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [thread, setThread] = useState({ ticket: null, messages: [] });

  const [chatText, setChatText] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState("");

  const [unreadCount, setUnreadCount] = useState(0);

  const threadBodyRef = useRef(null);

  const styles = useMemo(
    () => ({
      page: {
        minHeight: "100vh",
        padding: "28px 16px",
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(59,130,246,0.22), transparent 55%)," +
          "radial-gradient(900px 500px at 85% 25%, rgba(168,85,247,0.20), transparent 55%)," +
          "radial-gradient(900px 500px at 40% 90%, rgba(34,197,94,0.12), transparent 55%)," +
          "linear-gradient(180deg, #020617 0%, #01040e 100%)",
        color: "#e5e7eb",
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      },
      container: { maxWidth: 980, margin: "0 auto" },
      topRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 16,
      },
      backBtn: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 999,
        border: "1px solid rgba(148,163,184,0.22)",
        background: "rgba(2,6,23,0.6)",
        color: "#e5e7eb",
        fontSize: 13,
        cursor: "pointer",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        outline: "none",
      },
      badge: {
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid rgba(59,130,246,0.35)",
        background: "rgba(59,130,246,0.14)",
        color: "#bfdbfe",
        fontSize: 12,
        letterSpacing: 0.2,
        userSelect: "none",
      },
      hero: {
        padding: "18px 18px",
        borderRadius: 18,
        border: "1px solid rgba(148,163,184,0.18)",
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
        marginBottom: 18,
      },
      h1: { fontSize: 28, margin: 0, marginBottom: 8, letterSpacing: 0.2 },
      subtitle: {
        fontSize: 14,
        lineHeight: 1.75,
        opacity: 0.92,
        margin: 0,
        color: "#e5e7eb",
      },
      grid: {
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gap: 14,
      },
      col6: { gridColumn: "span 6" },
      col12: { gridColumn: "span 12" },
      card: {
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(148,163,184,0.16)",
        background: "rgba(2,6,23,0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
      },
      cardTitleRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 10,
      },
      h2: { fontSize: 18, margin: 0, letterSpacing: 0.2 },
      pill: {
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "rgba(15,23,42,0.55)",
        fontSize: 12,
        color: "#cbd5e1",
        whiteSpace: "nowrap",
      },
      p: { fontSize: 14, lineHeight: 1.75, margin: 0, opacity: 0.92 },
      small: { fontSize: 13, lineHeight: 1.7, opacity: 0.85, margin: 0 },
      list: {
        fontSize: 14,
        lineHeight: 1.9,
        paddingLeft: 18,
        margin: "10px 0 0 0",
        opacity: 0.95,
      },
      callout: {
        marginTop: 12,
        padding: 12,
        borderRadius: 14,
        border: "1px dashed rgba(148,163,184,0.22)",
        background: "rgba(15,23,42,0.45)",
        color: "#e5e7eb",
      },
      footer: {
        marginTop: 18,
        paddingTop: 16,
        borderTop: "1px solid rgba(148,163,184,0.14)",
        fontSize: 12,
        opacity: 0.65,
      },

      floatBtnWrap: { position: "fixed", right: 18, bottom: 18, zIndex: 9999 },
      floatBtn: {
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 999,
        border: "1px solid rgba(34, 197, 94, 0.56)",
        background:
          "linear-gradient(135deg, rgba(34,197,94,0.22), rgba(2, 6, 23, 0.7))",
        color: "#dcfce7",
        cursor: "pointer",
        boxShadow: "0 18px 60px rgba(0, 0, 0, 0.49)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        position: "relative",
      },
      floatDot: {
        width: 10,
        height: 10,
        borderRadius: 999,
        background: "#22c55e",
        boxShadow: "0 0 0 4px rgba(34, 197, 94, 0.56)",
      },
      floatTextWrap: { display: "flex", flexDirection: "column", lineHeight: 1.1 },
      floatTitle: { fontSize: 13, fontWeight: 700 },
      floatSub: { fontSize: 11, opacity: 0.85 },
      notifBadge: {
        position: "absolute",
        top: -6,
        right: -6,
        minWidth: 20,
        height: 20,
        padding: "0 6px",
        borderRadius: 999,
        background: "rgba(239,68,68,0.95)",
        color: "#fff",
        border: "2px solid rgba(2,6,23,0.85)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      },

      overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      },
      modal: {
        width: "min(560px, 100%)",
        borderRadius: 18,
        border: "1px solid rgba(14, 27, 45, 0.57)",
        background:
          "linear-gradient(135deg, rgba(24, 23, 23, 0.69), rgba(2, 6, 23, 0.65))",
        boxShadow: "0 24px 80px rgba(0, 0, 0, 0.4)",
        padding: 16,
      },
      modalHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
      },
      modalTitle: { margin: 0, fontSize: 18, letterSpacing: 0.2 },
      closeBtn: {
        borderRadius: 999,
        border: "1px solid rgba(148,163,184,0.22)",
        background: "rgba(2,6,23,0.6)",
        color: "#e5e7eb",
        padding: "8px 10px",
        cursor: "pointer",
      },
      field: { display: "flex", flexDirection: "column", gap: 6, marginTop: 10 },
      label: { fontSize: 12, color: "#cbd5e1", opacity: 0.9 },
      input: {
        width: "100%",
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "rgba(15,23,42,0.55)",
        color: "#e5e7eb",
        padding: "10px 12px",
        outline: "none",
        fontSize: 14,
      },
      textarea: {
        width: "100%",
        minHeight: 110,
        resize: "vertical",
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "rgba(15,23,42,0.55)",
        color: "#e5e7eb",
        padding: "10px 12px",
        outline: "none",
        fontSize: 14,
        lineHeight: 1.5,
      },
      modalActions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 12,
      },
      ghostBtn: {
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "transparent",
        color: "#cbd5e1",
        cursor: "pointer",
      },
      primaryBtn: {
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(59,130,246,0.35)",
        background: "rgba(59,130,246,0.18)",
        color: "#bfdbfe",
        cursor: "pointer",
        fontWeight: 700,
      },
      info: { marginTop: 10, fontSize: 12, opacity: 0.8, color: "#cbd5e1" },
      ok: {
        marginTop: 10,
        padding: 10,
        borderRadius: 12,
        border: "1px solid rgba(34,197,94,0.28)",
        background: "rgba(34,197,94,0.12)",
        color: "#dcfce7",
        fontSize: 13,
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

      chatModal: {
        width: "min(920px, 100%)",
        borderRadius: 18,
        border: "1px solid rgba(14, 27, 45, 0.57)",
        background:
          "linear-gradient(135deg, rgba(24, 23, 23, 0.69), rgba(2, 6, 23, 0.65))",
        boxShadow: "0 24px 80px rgba(0, 0, 0, 0.46)",
        overflow: "hidden",
      },
      chatHeader: {
        padding: 14,
        borderBottom: "1px solid rgba(148,163,184,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      },
      chatTitle: { margin: 0, fontSize: 16, letterSpacing: 0.2 },
      chatGrid: {
        display: "grid",
        gridTemplateColumns: isNarrow ? "1fr" : "340px 1fr",
        minHeight: isNarrow ? 520 : 560,
      },
      chatLeft: {
        borderRight: isNarrow ? "none" : "1px solid rgba(148,163,184,0.12)",
        borderBottom: isNarrow ? "1px solid rgba(148,163,184,0.12)" : "none",
        background: "rgba(2,6,23,0.35)",
      },
      chatRight: { background: "rgba(2,6,23,0.25)" },
      chatLeftTop: {
        padding: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        borderBottom: "1px solid rgba(148,163,184,0.12)",
      },
      chatList: { maxHeight: isNarrow ? 220 : 490, overflow: "auto" },
      ticketRow: (active) => ({
        padding: 12,
        cursor: "pointer",
        borderBottom: "1px solid rgba(148,163,184,0.10)",
        background: active ? "rgba(59,130,246,0.10)" : "transparent",
      }),
      ticketTop: { display: "flex", justifyContent: "space-between", gap: 10 },
      ticketSub: { fontSize: 12, opacity: 0.85, marginTop: 6, lineHeight: 1.35 },
      statusPill: (status) => ({
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
      }),
      chatThread: {
        padding: 12,
        maxHeight: isNarrow ? 260 : 430,
        overflow: "auto",
      },
      msg: (role) => ({
        maxWidth: "82%",
        marginBottom: 10,
        marginLeft: role === "user" ? "auto" : 0,
        padding: 10,
        borderRadius: 14,
        border: "1px solid rgba(148,163,184,0.14)",
        background: role === "user" ? "rgba(34,197,94,0.12)" : "rgba(15,23,42,0.55)",
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
      composerInput: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        resize: "vertical",
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "rgba(15,23,42,0.55)",
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
        background: "rgba(15,23,42,0.35)",
        color: "#cbd5e1",
        cursor: "pointer",
      },
      tiny: { fontSize: 12, opacity: 0.8 },
    }),
    [isNarrow]
  );

  const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const Card = ({ title, right, children, style }) => (
    <section style={{ ...styles.card, ...style }}>
      <div style={styles.cardTitleRow}>
        <h2 style={styles.h2}>{title}</h2>
        {right ? <div style={styles.pill}>{right}</div> : null}
      </div>
      {children}
    </section>
  );

  function authHeaders(extra = {}) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...extra,
    };
  }

  async function readApiError(res) {
    const txt = await res.text().catch(() => "");
    try {
      const j = txt ? JSON.parse(txt) : {};
      return j?.message || `Request failed (${res.status})`;
    } catch {
      return txt || `Request failed (${res.status})`;
    }
  }

  async function loadMyTickets({ silent = false } = {}) {
    if (!token) return;

    if (!silent) setTicketsLoading(true);
    try {
      const res = await fetch(`${API}/api/support/tickets/my`, {
        method: "GET",
        headers: authHeaders(),
      });

      if (!res.ok) return;

      const data = await res.json().catch(() => ({}));
      const tickets = Array.isArray(data.tickets) ? data.tickets : [];
      setMyTickets(tickets);

      const unread = tickets.reduce((acc, t) => {
        const seenKey = `support_seen_${t.id}`;
        const lastSeen = Number(localStorage.getItem(seenKey) || "0");
        const last = t?.last_message_at ? new Date(t.last_message_at).getTime() : 0;
        if (last && last > lastSeen) return acc + 1;
        return acc;
      }, 0);

      setUnreadCount(unread);
    } finally {
      if (!silent) setTicketsLoading(false);
    }
  }

  useEffect(() => {
    loadMyTickets();
    const t = setInterval(() => loadMyTickets({ silent: true }), 25000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadThread(ticketId) {
    if (!token || !ticketId) return;
    setThreadLoading(true);
    setChatError("");
    try {
      const res = await fetch(`${API}/api/support/tickets/${ticketId}`, {
        method: "GET",
        headers: authHeaders(),
      });

      if (!res.ok) {
        const msg = await readApiError(res);
        throw new Error(msg);
      }

      const data = await res.json().catch(() => ({}));
      setThread({ ticket: data.ticket || null, messages: data.messages || [] });

      const seenKey = `support_seen_${ticketId}`;
      const last = data?.ticket?.last_message_at
        ? new Date(data.ticket.last_message_at).getTime()
        : Date.now();
      localStorage.setItem(seenKey, String(last));
      loadMyTickets({ silent: true });
    } catch (e) {
      setChatError(e?.message || "Failed to load messages");
    } finally {
      setThreadLoading(false);
      setTimeout(() => {
        if (threadBodyRef.current) {
          threadBodyRef.current.scrollTop = threadBodyRef.current.scrollHeight;
        }
      }, 80);
    }
  }

  async function submitSupport() {
    setError("");
    setSentOk(false);

    if (!token) {
      setError("Login required. Please logout and login again.");
      return;
    }
    if (!subject.trim()) {
      setError("Please enter a subject.");
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      setError("Please describe the issue (min 10 characters).");
      return;
    }

    try {
      setSending(true);

      const res = await fetch(`${API}/api/support/tickets`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          source: "helpcenter_badge",
        }),
      });

      if (!res.ok) {
        const msg = await readApiError(res);
        throw new Error(msg);
      }

      const data = await res.json().catch(() => ({}));

      setSentOk(true);
      setSubject("");
      setMessage("");

      await loadMyTickets();
      if (data?.ticket_id) {
        setChatOpen(true);
        setActiveTicketId(data.ticket_id);
        await loadThread(data.ticket_id);
      }
    } catch (e) {
      setError(e?.message || "Failed to send. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function sendChatMessage() {
    setChatError("");
    if (!token) {
      setChatError("Login required. Please login again.");
      return;
    }
    if (!activeTicketId) {
      setChatError("Select a ticket first.");
      return;
    }
    if (!chatText.trim()) return;

    try {
      setChatSending(true);

      const res = await fetch(`${API}/api/support/tickets/${activeTicketId}/message`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ message: chatText.trim() }),
      });

      if (!res.ok) {
        const msg = await readApiError(res);
        throw new Error(msg);
      }

      setChatText("");
      await loadThread(activeTicketId);
      await loadMyTickets({ silent: true });
    } catch (e) {
      setChatError(e?.message || "Failed to send message");
    } finally {
      setChatSending(false);
      setTimeout(() => {
        if (threadBodyRef.current) {
          threadBodyRef.current.scrollTop = threadBodyRef.current.scrollHeight;
        }
      }, 80);
    }
  }

  function openChatSmart() {
    setChatError("");
    setChatOpen(true);
    const pick = activeTicketId || (myTickets[0] ? myTickets[0].id : null);
    setActiveTicketId(pick);
    if (pick) loadThread(pick);
  }

  useEffect(() => {
    if (chatOpen && activeTicketId) loadThread(activeTicketId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTicketId]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topRow}>
          <button
            type="button"
            onClick={handleBack}
            style={styles.backBtn}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow =
                "0 0 0 3px rgba(59,130,246,0.35), 0 10px 30px rgba(0,0,0,0.25)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.25)";
            }}
          >
            ← Back
          </button>

          <div style={styles.badge}>Support • Policies • Payments</div>
        </div>

        <div style={styles.hero}>
          <h1 style={styles.h1}>Help Center &amp; Customer Support</h1>
          <p style={styles.subtitle}>
            Welcome to the Help Center of <strong>Free Fire Tournament Platform</strong>. We are committed to
            providing transparent support for all users regarding tournaments, registrations, wallet transactions,
            and account-related queries.
          </p>
        </div>

        <div style={styles.grid}>
          {/* ✅ REMOVED: My Tickets section */}

          <div style={{ ...(isNarrow ? styles.col12 : styles.col6) }}>
            <Card title="Contact Us" right="Fast response">
              <ul style={styles.list}>
                <li>
                  <strong>Email:</strong> freefiretournamentbot@gmail.com
                </li>
                <li>
                  <strong>Phone / WhatsApp:</strong> +91-9860803102
                </li>
                <li>
                  <strong>Support Hours:</strong> 10:00 AM – 8:00 PM (IST), Monday to Saturday
                </li>
              </ul>

              <div style={styles.callout}>
                <p style={styles.small}>We aim to respond to all support queries within 24–48 business hours.</p>
              </div>
            </Card>
          </div>

          <div style={{ ...(isNarrow ? styles.col12 : styles.col6) }}>
            <Card title="Legal & Policy Information" right="Read before paying">
              <p style={styles.p}>
                Detailed policies such as Privacy Policy, Terms &amp; Conditions and Refund / Cancellation Policy
                are available from the footer or main menu of this application. Please review them carefully
                before participating in any paid tournaments.
              </p>
            </Card>
          </div>

          <div style={styles.col12}>
            <Card title="Payments & Wallet Information" right="Secure gateway">
              <p style={styles.p}>
                All payments on this platform are processed securely using trusted payment gateways such as{" "}
                <strong>Razorpay</strong>. Applicable payment gateway charges, taxes (including GST), and service
                fees may be deducted as per the payment provider’s policies.
              </p>

              <div style={{ height: 10 }} />

              <p style={styles.small}>
                Wallet balances are non-transferable and can only be used for tournament participation on this
                platform.
              </p>
            </Card>
          </div>

          <div style={{ ...(isNarrow ? styles.col12 : styles.col6) }}>
            <Card title="Refund & Cancellation Summary" right="Usually non-refundable">
              <p style={styles.p}>
                Tournament entry fees and wallet top-ups are generally <strong>non-refundable</strong>, except in
                cases where a tournament is cancelled by the platform or due to verified technical issues.
              </p>

              <div style={{ height: 10 }} />

              <p style={styles.small}>
                Any eligible refunds, if applicable, will be processed back to the original payment source or
                wallet within a reasonable timeframe as per Razorpay settlement norms.
              </p>
            </Card>
          </div>

          <div style={{ ...(isNarrow ? styles.col12 : styles.col6) }}>
            <Card title="Skill-Based Game Disclaimer" right="No gambling">
              <p style={styles.p}>
                This platform hosts only <strong>skill-based online gaming tournaments</strong>. The outcome of
                each match is determined solely by the skill, strategy, and performance of participants.
              </p>

              <div style={{ height: 10 }} />

              <p style={styles.small}>
                No gambling, betting, lottery, or chance-based games are offered. This platform is intended for
                entertainment for eligible users and does not promote or support illegal activities.
              </p>
            </Card>
          </div>

          <div style={styles.col12}>
            <Card title="Compliance & Legal Jurisdiction" right="India">
              <p style={styles.p}>
                This application is intended to comply with applicable Indian IT laws and payment regulations.
                Users must be 18 years or older to participate in paid tournaments.
              </p>

              <div style={{ height: 10 }} />

              <p style={styles.small}>
                Any disputes shall be governed by the laws of India, with jurisdiction resting with the
                appropriate courts in India.
              </p>

              <div style={styles.footer}>
                © {new Date().getFullYear()} Free Fire Tournament Platform. All rights reserved.
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Floating Help Badge */}
      <div style={styles.floatBtnWrap}>
        <button
          type="button"
          onClick={() => {
            setSupportOpen(true);
            setError("");
            setSentOk(false);
          }}
          style={styles.floatBtn}
          aria-label="Open support message form"
          title="Need help? Message admin"
        >
          {unreadCount ? (
            <span style={styles.notifBadge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
          ) : null}
          <span style={styles.floatDot} />
          <span style={styles.floatTextWrap}>
            <span style={styles.floatTitle}>Help</span>
            <span style={styles.floatSub}>Message Admin</span>
          </span>
        </button>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button type="button" style={styles.smallBtn} onClick={openChatSmart}>
            Open My Tickets
          </button>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {supportOpen ? (
        <div style={styles.overlay} onClick={() => setSupportOpen(false)}>
          <div
            style={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="supportDialogTitle"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3 id="supportDialogTitle" style={styles.modalTitle}>
                Contact Support
              </h3>
              <button type="button" onClick={() => setSupportOpen(false)} style={styles.closeBtn}>
                ✕
              </button>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Subject</div>
              <input
                style={styles.input}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Payment issue / Match not showing / Withdrawal"
                maxLength={80}
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Describe your problem</div>
              <textarea
                style={styles.textarea}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write details like match id, screenshot info, transaction id, etc."
                maxLength={1200}
              />
            </div>

            {sentOk ? <div style={styles.ok}>Message sent. Support will reply soon.</div> : null}
            {error ? <div style={styles.err}>{error}</div> : null}

            <div style={styles.modalActions}>
              <button type="button" style={styles.ghostBtn} onClick={() => setSupportOpen(false)} disabled={sending}>
                Close
              </button>
              <button
                type="button"
                style={{
                  ...styles.primaryBtn,
                  opacity: sending ? 0.75 : 1,
                  cursor: sending ? "not-allowed" : "pointer",
                }}
                onClick={submitSupport}
                disabled={sending}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>

            <div style={styles.info}>Tip: Include match id / payment id for faster resolution.</div>
          </div>
        </div>
      ) : null}

      {/* Chat modal */}
      {chatOpen ? (
        <div style={styles.overlay} onClick={() => setChatOpen(false)}>
          <div
            style={styles.chatModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="chatDialogTitle"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.chatHeader}>
              <div>
                <h3 id="chatDialogTitle" style={styles.chatTitle}>
                  My Support Tickets
                </h3>
                <div style={styles.tiny}>{token ? "Chat with support team." : "Login required."}</div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" style={styles.smallBtn} onClick={() => loadMyTickets()} disabled={ticketsLoading}>
                  {ticketsLoading ? "Loading..." : "Refresh"}
                </button>
                <button type="button" style={styles.closeBtn} onClick={() => setChatOpen(false)}>
                  ✕
                </button>
              </div>
            </div>

            <div style={styles.chatGrid}>
              <div style={styles.chatLeft}>
                <div style={styles.chatLeftTop}>
                  <div style={{ fontSize: 13, opacity: 0.9 }}>Tickets: {myTickets.length}</div>
                  <button
                    type="button"
                    style={styles.smallBtn}
                    onClick={() => {
                      setChatOpen(false);
                      setSupportOpen(true);
                      setError("");
                      setSentOk(false);
                    }}
                  >
                    + New
                  </button>
                </div>

                <div style={styles.chatList}>
                  {!token ? (
                    <div style={{ padding: 12, opacity: 0.8, fontSize: 13 }}>
                      Please login again to view tickets.
                    </div>
                  ) : myTickets.length === 0 ? (
                    <div style={{ padding: 12, opacity: 0.8, fontSize: 13 }}>
                      No tickets yet. Create one from “+ New”.
                    </div>
                  ) : (
                    myTickets.map((t) => (
                      <div
                        key={t.id}
                        style={styles.ticketRow(t.id === activeTicketId)}
                        onClick={() => setActiveTicketId(t.id)}
                      >
                        <div style={styles.ticketTop}>
                          <div style={{ fontWeight: 800, fontSize: 13 }}>
                            #{t.id} • {t.subject}
                          </div>
                          <div style={styles.statusPill(t.status)}>{t.status}</div>
                        </div>
                        <div style={styles.ticketSub}>
                          Updated: {t.last_message_at ? new Date(t.last_message_at).toLocaleString() : "-"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={styles.chatRight}>
                <div style={{ padding: 12, borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>
                    {thread?.ticket
                      ? `Ticket #${thread.ticket.id} • ${thread.ticket.subject}`
                      : activeTicketId
                      ? `Ticket #${activeTicketId}`
                      : "Select a ticket"}
                  </div>
                  <div style={styles.tiny}>{thread?.ticket ? `Status: ${thread.ticket.status}` : ""}</div>
                </div>

                <div ref={threadBodyRef} style={styles.chatThread}>
                  {threadLoading ? (
                    <div style={{ opacity: 0.8, fontSize: 13 }}>Loading messages...</div>
                  ) : !activeTicketId ? (
                    <div style={{ opacity: 0.8, fontSize: 13 }}>Choose a ticket from left.</div>
                  ) : (thread.messages || []).length === 0 ? (
                    <div style={{ opacity: 0.8, fontSize: 13 }}>No messages yet.</div>
                  ) : (
                    (thread.messages || []).map((m) => (
                      <div key={m.id} style={styles.msg(m.sender_role)}>
                        {m.message}
                        <div style={styles.meta}>
                          {String(m.sender_role || "").toUpperCase()} •{" "}
                          {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                        </div>
                      </div>
                    ))
                  )}

                  {chatError ? <div style={styles.err}>{chatError}</div> : null}
                </div>

                <div style={styles.composer}>
                  <textarea
                    style={styles.composerInput}
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder={activeTicketId ? "Type message..." : "Select ticket to chat..."}
                    disabled={!token || !activeTicketId}
                    maxLength={2000}
                  />
                  <button
                    type="button"
                    style={{
                      ...styles.btn,
                      opacity: chatSending || !activeTicketId ? 0.7 : 1,
                      cursor: chatSending || !activeTicketId ? "not-allowed" : "pointer",
                    }}
                    disabled={chatSending || !token || !activeTicketId}
                    onClick={sendChatMessage}
                  >
                    {chatSending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}