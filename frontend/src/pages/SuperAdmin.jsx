// frontend/src/pages/SuperAdmin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SuperAdmin() {
  const navigate = useNavigate();
  const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const token = localStorage.getItem("token") || "";

  const myUserRaw = localStorage.getItem("user") || "";
  let myEmail = "";
  try {
    const u = myUserRaw ? JSON.parse(myUserRaw) : null;
    myEmail = (u?.email || "").toString().trim().toLowerCase();
  } catch {}

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");

  // ✅ Manual wallet adjust form state
  const [creditEmail, setCreditEmail] = useState("");
  const [creditAmount, setCreditAmount] = useState(100);
  const [creditNote, setCreditNote] = useState("");
  const [walletMode, setWalletMode] = useState("credit"); // "credit" | "debit"

  // ✅ Admin stats + logs
  const [adminStats, setAdminStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  const wrap = {
    minHeight: "100vh",
    padding: "28px 18px",
    background:
      "radial-gradient(1000px 500px at 10% 5%, rgba(56,189,248,0.15), transparent 50%), radial-gradient(900px 500px at 90% 20%, rgba(34,197,94,0.12), transparent 55%), linear-gradient(180deg, #060913, #050613)",
    color: "#e6eef8",
    fontFamily:
      "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  };

  const container = { maxWidth: 1100, margin: "0 auto" };

  const topBar = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 14px",
    borderRadius: 16,
    background: "rgba(2,6,23,0.55)",
    border: "1px solid rgba(148,163,184,0.16)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
  };

  const title = { fontSize: 20, fontWeight: 900, margin: 0 };
  const sub = { fontSize: 13, opacity: 0.8, marginTop: 4 };

  const btn = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(15,23,42,0.7)",
    color: "#e6eef8",
    cursor: "pointer",
    fontWeight: 700,
  };

  const btnPrimary = {
    ...btn,
    border: "none",
    backgroundImage: "linear-gradient(90deg,#38bdf8,#22c55e)",
    color: "#020617",
  };

  const grid2 = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 14,
    marginTop: 14,
  };

  const panel = {
    borderRadius: 16,
    padding: 14,
    border: "1px solid rgba(148,163,184,0.16)",
    background: "rgba(2,6,23,0.55)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
  };

  const label = { fontSize: 12, opacity: 0.8, marginBottom: 8 };
  const input = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(15,23,42,0.55)",
    color: "#e6eef8",
    outline: "none",
  };

  const alertOk = {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(34,197,94,0.12)",
    border: "1px solid rgba(34,197,94,0.28)",
    color: "#bbf7d0",
    fontSize: 13,
  };

  const alertErr = {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(239,68,68,0.10)",
    border: "1px solid rgba(239,68,68,0.30)",
    color: "#fecaca",
    fontSize: 13,
  };

  const rolePill = (role) => {
    const r = String(role || "").toLowerCase();
    let bg = "rgba(148,163,184,0.18)";
    let border = "rgba(148,163,184,0.28)";
    let color = "#e2e8f0";
    if (r === "admin") {
      bg = "rgba(56,189,248,0.12)";
      border = "rgba(56,189,248,0.28)";
      color = "#bae6fd";
    }
    if (r === "superadmin") {
      bg = "rgba(34,197,94,0.12)";
      border = "rgba(34,197,94,0.28)";
      color = "#bbf7d0";
    }
    return {
      display: "inline-block",
      padding: "3px 8px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      background: bg,
      border: `1px solid ${border}`,
      color,
      textTransform: "capitalize",
    };
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

  async function loadUsers() {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/superadmin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      setUsers(data?.users || []);
    } catch (e) {
      setUsers([]);
      setErr(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function makeAdmin() {
    setErr("");
    setMsg("");
    const em = (email || "").trim().toLowerCase();
    if (!em) return setErr("Enter email first");

    if (myEmail && em === myEmail) {
      return setErr("You cannot change your own role from this box.");
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/superadmin/make-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: em }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      setMsg(data?.message || "Done");
      setEmail("");
      loadUsers();
      loadAdminStats();
      loadAuditLogs();
    } catch (e) {
      setErr(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function removeAdmin() {
    setErr("");
    setMsg("");
    const em = (email || "").trim().toLowerCase();
    if (!em) return setErr("Enter email first");

    if (myEmail && em === myEmail) {
      return setErr("You cannot remove your own admin access here.");
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/superadmin/remove-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: em }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      setMsg(data?.message || "Done");
      setEmail("");
      loadUsers();
      loadAdminStats();
      loadAuditLogs();
    } catch (e) {
      setErr(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Manual wallet credit/debit action (same form)
  async function manualWalletAdjust() {
    setErr("");
    setMsg("");

    const em = (creditEmail || "").trim().toLowerCase();
    const amt = Number(creditAmount);
    const mode = (walletMode || "credit").toString();

    if (!em) return setErr("Enter user email first");
    if (!amt || !Number.isFinite(amt) || amt <= 0) return setErr("Enter valid amount");

    const endpoint =
      mode === "debit"
        ? `${API}/api/admin/superadmin/wallet/debit`
        : `${API}/api/admin/superadmin/wallet/credit`;

    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: em,
          amount: amt,
          note: (creditNote || "").trim(),
        }),
      });

      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();

      setMsg(
        data?.message ||
          (mode === "debit"
            ? `Wallet debited. New balance: ₹${Number(data?.wallet_after || 0).toFixed(2)}`
            : `Wallet credited. New balance: ₹${Number(data?.wallet_after || 0).toFixed(2)}`)
      );

      setCreditEmail("");
      setCreditAmount(100);
      setCreditNote("");
      setWalletMode("credit");

      loadUsers();
      loadAdminStats();
      loadAuditLogs();
    } catch (e) {
      setErr(e?.message || (mode === "debit" ? "Failed to debit wallet" : "Failed to credit wallet"));
    } finally {
      setLoading(false);
    }
  }

  async function loadAdminStats() {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/superadmin/admin-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      setAdminStats(data || null);
    } catch {
      setAdminStats(null);
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadAuditLogs() {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/superadmin/audit-logs?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      setAuditLogs(data?.logs || []);
    } catch {
      setAuditLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const s = (q || "").trim().toLowerCase();
    if (!s) return users;

    return users.filter((u) => {
      const name = (u?.name || "").toString().toLowerCase();
      const email2 = (u?.email || "").toString().toLowerCase();
      const role = (u?.role || "").toString().toLowerCase();
      return name.includes(s) || email2.includes(s) || role.includes(s);
    });
  }, [users, q]);

  useEffect(() => {
    loadUsers();
    loadAdminStats();
    loadAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adminsOnly = useMemo(() => {
    const list = adminStats?.admins || [];
    return list;
  }, [adminStats]);

  return (
    <div style={wrap}>
      <div style={container}>
        <div style={topBar}>
          <div>
            <h2 style={title}>SuperAdmin</h2>
            <div style={sub}>
              Only <b>vivektatharkar@gmail.com</b> can use these tools.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => navigate(-1)} style={btn} type="button">
              ← Back
            </button>
            <button onClick={() => navigate("/admin")} style={btn} type="button">
              Admin Panel
            </button>
            <button
              onClick={() => {
                loadUsers();
                loadAdminStats();
                loadAuditLogs();
              }}
              style={btnPrimary}
              type="button"
              disabled={loading || statsLoading || logsLoading}
              title="Refresh"
            >
              {loading || statsLoading || logsLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        <div style={grid2}>
          <div style={panel}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Admin roles</div>

            <div style={label}>User email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              style={input}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button onClick={makeAdmin} style={btnPrimary} disabled={loading} type="button">
                Make admin
              </button>
              <button onClick={removeAdmin} style={btn} disabled={loading} type="button">
                Remove admin
              </button>
            </div>

            {msg ? <div style={alertOk}>{msg}</div> : null}
            {err ? <div style={alertErr}>{err}</div> : null}
          </div>

          {/* Manual wallet credit/debit */}
          <div style={panel}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Manual wallet adjust</div>

            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={label}>Mode</div>
                <select
                  value={walletMode}
                  onChange={(e) => setWalletMode(e.target.value)}
                  style={input}
                >
                  <option value="credit">Credit (Add)</option>
                  <option value="debit">Debit (Subtract)</option>
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <div style={label}>User email</div>
                <input
                  value={creditEmail}
                  onChange={(e) => setCreditEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  style={input}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={label}>Amount (₹)</div>
                <input
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  type="number"
                  min="1"
                  step="1"
                  style={input}
                />
              </div>
              <div style={{ flex: 2 }}>
                <div style={label}>Note (optional)</div>
                <input
                  value={creditNote}
                  onChange={(e) => setCreditNote(e.target.value)}
                  placeholder="Reason / reference"
                  style={input}
                />
              </div>
            </div>

            {walletMode === "debit" ? (
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85, color: "#fecaca" }}>
                Warning: Debit will subtract money (fails if user has insufficient balance).
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                Tip: This will create a Payment record with gateway=manual and send a notification.
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button
                onClick={manualWalletAdjust}
                style={btnPrimary}
                disabled={loading}
                type="button"
              >
                {walletMode === "debit" ? "Subtract money" : "Add money"}
              </button>

              <button
                onClick={() => {
                  setCreditEmail("");
                  setCreditAmount(100);
                  setCreditNote("");
                  setWalletMode("credit");
                }}
                style={btn}
                disabled={loading}
                type="button"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={panel}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Search</div>

            <div style={label}>Quick search (name / email / role)</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              style={input}
            />

            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
              Showing <b>{filteredUsers.length}</b> users (latest max 500 from server).
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Tip: If user is not in this list, paste their email in “Admin roles” or “Manual wallet adjust”.
            </div>
          </div>
        </div>

        {/* Admin stats */}
        <div style={{ ...panel, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>Admin activity (last 7 days)</div>
            <button onClick={loadAdminStats} style={btn} type="button" disabled={statsLoading}>
              {statsLoading ? "Loading..." : "Refresh stats"}
            </button>
          </div>

          {adminsOnly.length === 0 ? (
            <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
              No admins found (or stats not loaded).
            </div>
          ) : (
            <div style={{ marginTop: 10, border: "1px solid rgba(148,163,184,0.16)", borderRadius: 14, overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr 1fr 140px 140px",
                  padding: 10,
                  background: "rgba(15,23,42,0.65)",
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                <div>ID</div>
                <div>Name</div>
                <div>Email</div>
                <div>Role</div>
                <div>Actions (7d)</div>
              </div>

              {adminsOnly.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "90px 1fr 1fr 140px 140px",
                    padding: 10,
                    borderTop: "1px solid rgba(148,163,184,0.12)",
                    fontSize: 13,
                  }}
                >
                  <div style={{ opacity: 0.85 }}>{a.id}</div>
                  <div>{a.name}</div>
                  <div style={{ opacity: 0.9 }}>{a.email}</div>
                  <div><span style={rolePill(a.role)}>{a.role}</span></div>
                  <div style={{ fontWeight: 900 }}>{a?.actions_7d?.total || 0}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit logs */}
        <div style={{ ...panel, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>Audit logs (latest 200)</div>
            <button onClick={loadAuditLogs} style={btn} type="button" disabled={logsLoading}>
              {logsLoading ? "Loading..." : "Refresh logs"}
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
              No logs yet.
            </div>
          ) : (
            <div style={{ marginTop: 10, border: "1px solid rgba(148,163,184,0.16)", borderRadius: 14, overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 180px 1fr 120px 1fr",
                  padding: 10,
                  background: "rgba(15,23,42,0.65)",
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                <div>ID</div>
                <div>Actor</div>
                <div>Action</div>
                <div>Amount</div>
                <div>Note</div>
              </div>

              {auditLogs.map((l) => (
                <div
                  key={l.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "90px 180px 1fr 120px 1fr",
                    padding: 10,
                    borderTop: "1px solid rgba(148,163,184,0.12)",
                    fontSize: 13,
                  }}
                >
                  <div style={{ opacity: 0.85 }}>{l.id}</div>
                  <div style={{ opacity: 0.9 }}>
                    {(l.actor_email || "").toString() || `#${l.actor_user_id}`}
                  </div>
                  <div style={{ fontWeight: 800 }}>{l.action}</div>
                  <div style={{ opacity: 0.9 }}>
                    {l.amount != null ? `₹${Number(l.amount).toFixed(2)}` : "-"}
                  </div>
                  <div style={{ opacity: 0.85 }}>{l.note || ""}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Users Table */}
        <div style={{ ...panel, marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>
            Latest users (max 500)
          </div>

          <div style={{ border: "1px solid rgba(148,163,184,0.16)", borderRadius: 14, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "90px 1fr 1fr 140px",
                padding: 10,
                background: "rgba(15,23,42,0.65)",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              <div>ID</div>
              <div>Name</div>
              <div>Email</div>
              <div>Role</div>
            </div>

            {filteredUsers.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr 1fr 140px",
                  padding: 10,
                  borderTop: "1px solid rgba(148,163,184,0.12)",
                  fontSize: 13,
                }}
              >
                <div style={{ opacity: 0.85 }}>{u.id}</div>
                <div>{u.name}</div>
                <div style={{ opacity: 0.9 }}>{u.email}</div>
                <div>
                  <span style={rolePill(u.role)}>{u.role}</span>
                </div>
              </div>
            ))}

            {!loading && filteredUsers.length === 0 ? (
              <div style={{ padding: 12, opacity: 0.75, fontSize: 13 }}>
                No users found.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}