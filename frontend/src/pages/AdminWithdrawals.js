// frontend/src/pages/AdminWithdrawals.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://localhost:5000"; // change if needed

const wrap = {
  minHeight: "100vh",
  padding: "24px 16px",
  boxSizing: "border-box",
  background:
    "radial-gradient(1000px 500px at 10% 5%, rgba(56,189,248,0.12), transparent 50%), radial-gradient(900px 500px at 90% 20%, rgba(34,197,94,0.10), transparent 55%), linear-gradient(180deg, #020617 0%, #000 100%)",
  color: "#e5e7eb",
  fontFamily:
    "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
};

const card = {
  maxWidth: 1250,
  margin: "0 auto",
  background: "rgba(15,23,42,0.96)",
  borderRadius: 18,
  padding: 16,
  border: "1px solid rgba(148,163,184,0.18)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.75)",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const title = { margin: 0, fontSize: 22, fontWeight: 900 };

const sub = { fontSize: 12, color: "#9ca3af", marginTop: 6 };

const btn = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(2,6,23,0.35)",
  color: "#e5e7eb",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

const input = {
  marginTop: 12,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.22)",
  width: "100%",
  maxWidth: 520,
  fontSize: 13,
  outline: "none",
  background: "rgba(2,6,23,0.35)",
  color: "#e5e7eb",
};

const tableWrap = {
  marginTop: 12,
  borderRadius: 12,
  overflow: "hidden",
  border: "1px solid rgba(148,163,184,0.25)",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 980,
  fontSize: 13,
};

const th = {
  padding: "10px 10px",
  textAlign: "left",
  whiteSpace: "nowrap",
  background:
    "linear-gradient(180deg, rgba(30,64,175,0.95), rgba(15,23,42,0.98))",
  borderBottom: "1px solid rgba(148,163,184,0.35)",
};

const td = {
  padding: "9px 10px",
  borderBottom: "1px solid rgba(30,41,59,0.85)",
  whiteSpace: "nowrap",
  verticalAlign: "top",
};

const pill = (status) => {
  let bg = "rgba(148,163,184,0.18)";
  let border = "rgba(148,163,184,0.28)";
  if (status === "success") {
    bg = "rgba(34,197,94,0.16)";
    border = "rgba(34,197,94,0.28)";
  } else if (status === "pending") {
    bg = "rgba(245,158,11,0.14)";
    border = "rgba(245,158,11,0.28)";
  } else if (status === "rejected") {
    bg = "rgba(239,68,68,0.12)";
    border = "rgba(239,68,68,0.28)";
  }
  return {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: 11,
    border: `1px solid ${border}`,
    background: bg,
    color: "#e5e7eb",
    textTransform: "capitalize",
    fontWeight: 800,
  };
};

const btnApprove = {
  marginRight: 8,
  padding: "6px 10px",
  fontSize: 12,
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  backgroundImage: "linear-gradient(90deg,#22c55e,#38bdf8)",
  color: "#020617",
  fontWeight: 900,
};

const btnReject = {
  padding: "6px 10px",
  fontSize: 12,
  borderRadius: 10,
  border: "1px solid rgba(239,68,68,0.35)",
  cursor: "pointer",
  background: "rgba(239,68,68,0.10)",
  color: "#fecaca",
  fontWeight: 900,
};

function safeLower(v) {
  return (v ?? "").toString().toLowerCase();
}

export default function AdminWithdrawals() {
  const navigate = useNavigate();

  const [allRows, setAllRows] = useState([]);
  const [search, setSearch] = useState("");

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [userError, setUserError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/api/payments/withdrawals`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const rows = Array.isArray(res.data)
          ? res.data
          : res.data?.withdrawals || [];

        setAllRows(rows);
      } catch (e) {
        console.error("load withdrawals error", e);
        setAllRows([]);
      }
    };
    load();
  }, []);

  const act = async (id, action) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/api/payments/withdrawals/${id}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAllRows((s) =>
        s.map((x) =>
          x.id === id
            ? { ...x, status: action === "approve" ? "success" : "rejected" }
            : x
        )
      );
    } catch (e) {
      console.error("withdrawal action error", e);
      const msg =
        e.response?.data?.message ||
        e.message ||
        "Failed to update withdrawal status";
      alert(msg);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (allRows || []).filter((w) => {
      if (!q) return true;
      const fields = [
        w.user_name,
        w.email,
        w.phone,
        w.upi_id,
        w.status,
        w.type,
        w.description,
        String(w.user_id),
        String(w.id),
      ];
      return fields.some((f) => safeLower(f).includes(q));
    });
  }, [allRows, search]);

  const openUserProfile = async (userId) => {
    setSelectedUserId(userId);
    setSelectedUserData(null);
    setUserError("");
    setLoadingUser(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE}/api/admin/users/${userId}/activity`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data || {};
      data.transactions = Array.isArray(data.transactions)
        ? data.transactions
        : [];
      setSelectedUserData(data);
    } catch (e) {
      console.error("load user activity error", e);
      setUserError(e.response?.data?.message || "Failed to load user profile");
    } finally {
      setLoadingUser(false);
    }
  };

  const closeUserProfile = () => {
    setSelectedUserId(null);
    setSelectedUserData(null);
    setUserError("");
  };

  const userTransactions = Array.isArray(selectedUserData?.transactions)
    ? selectedUserData.transactions
    : [];

  const backendTournamentTotal =
    selectedUserData?.tournament_deduction ??
    selectedUserData?.tournamentDeduction ??
    selectedUserData?.tournament_total ??
    0;

  const computedTournamentTotal = userTransactions
    .filter((t) => {
      const type = safeLower(t.type);
      return type.includes("tournament") || type.includes("fee") || type.includes("deduction");
    })
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  const tournamentTotal =
    backendTournamentTotal && Number(backendTournamentTotal) !== 0
      ? backendTournamentTotal
      : computedTournamentTotal;

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={headerRow}>
          <div>
            <h2 style={title}>Withdrawal Requests</h2>
            <div style={sub}>
              Click a user name to open activity + wallet summary.
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, UPI, status, type..."
              style={input}
            />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => navigate(-1)} style={btn} type="button">
              ← Back
            </button>
            <div style={{ ...btn, cursor: "default" }}>
              Total: <b>{list.length}</b>
            </div>
          </div>
        </div>

        {list.length === 0 ? (
          <p style={{ marginTop: 10, fontSize: 13, color: "#9ca3af" }}>
            No withdrawal requests.
          </p>
        ) : (
          <div style={tableWrap}>
            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead>
                  <tr style={{ color: "#e5e7eb" }}>
                    <th style={th}>User Name</th>
                    <th style={th}>User ID</th>
                    <th style={th}>Email</th>
                    <th style={th}>Phone</th>
                    <th style={th}>Type</th>
                    <th style={th}>Amount</th>
                    <th style={th}>UPI</th>
                    <th style={th}>Status</th>
                    <th style={th}>Date / Time</th>
                    <th style={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((w) => (
                    <tr key={w.id}>
                      <td
                        style={{
                          ...td,
                          cursor: "pointer",
                          color: "#60a5fa",
                          fontWeight: 800,
                        }}
                        onClick={() => openUserProfile(w.user_id)}
                        title="Click to view full profile"
                      >
                        {w.user_name || "-"}
                      </td>
                      <td style={{ ...td, fontFamily: "monospace" }}>{w.user_id}</td>
                      <td style={td}>{w.email || "-"}</td>
                      <td style={td}>{w.phone || "-"}</td>
                      <td style={td}>{w.type || "withdrawal"}</td>
                      <td style={td}>₹{Math.abs(Number(w.amount) || 0)}</td>
                      <td style={td}>{w.upi_id}</td>
                      <td style={td}>
                        <span style={pill(w.status)}>{w.status}</span>
                      </td>
                      <td style={td}>{formatDateTime(w.created_at)}</td>
                      <td style={td}>
                        {w.status === "pending" ? (
                          <>
                            <button onClick={() => act(w.id, "approve")} style={btnApprove}>
                              Approve
                            </button>
                            <button onClick={() => act(w.id, "reject")} style={btnReject}>
                              Reject
                            </button>
                          </>
                        ) : (
                          <span style={{ opacity: 0.85 }}>{w.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* side panel */}
      {selectedUserId && (
        <>
          <div
            onClick={closeUserProfile}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.55)",
              zIndex: 190,
            }}
          />

          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: 410,
              maxWidth: "92vw",
              height: "100vh",
              background: "rgba(2,6,23,0.98)",
              color: "#e5e7eb",
              boxShadow: "-8px 0 30px rgba(0,0,0,0.7)",
              padding: 16,
              zIndex: 200,
              overflowY: "auto",
              borderLeft: "1px solid rgba(148,163,184,0.16)",
            }}
          >
            <button
              onClick={closeUserProfile}
              style={{
                border: "1px solid rgba(148,163,184,0.22)",
                background: "rgba(15,23,42,0.55)",
                color: "#cbd5e1",
                fontSize: 14,
                borderRadius: 10,
                padding: "6px 10px",
                cursor: "pointer",
                float: "right",
              }}
            >
              Close
            </button>

            {loadingUser ? (
              <p style={{ marginTop: 50, fontSize: 13, color: "#cbd5e1" }}>
                Loading user profile…
              </p>
            ) : userError ? (
              <p style={{ marginTop: 50, color: "#fca5a5", fontSize: 13 }}>
                {userError}
              </p>
            ) : !selectedUserData ? (
              <p style={{ marginTop: 50, fontSize: 13, color: "#cbd5e1" }}>
                No data.
              </p>
            ) : (
              <>
                <h3 style={{ marginTop: 48, marginBottom: 6, fontSize: 18 }}>
                  {selectedUserData.user?.name || "User"}{" "}
                  <span style={{ opacity: 0.75, fontSize: 13 }}>
                    (ID {selectedUserData.user?.id})
                  </span>
                </h3>

                <div style={{ fontSize: 13, color: "#9ca3af" }}>
                  {selectedUserData.user?.email}
                  <br />
                  {selectedUserData.user?.phone}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 14,
                    background:
                      "linear-gradient(120deg, rgba(34,197,94,0.12), rgba(15,23,42,1))",
                    border: "1px solid rgba(34,197,94,0.28)",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 900 }}>
                    Wallet: ₹{selectedUserData.wallet_balance ?? 0}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6, color: "#cbd5e1" }}>
                    Total credit: ₹{selectedUserData.total_credit ?? 0}
                    <br />
                    Total debit: ₹{selectedUserData.total_debit ?? 0}
                    <br />
                    Tournament deductions: ₹{tournamentTotal}
                  </div>
                </div>

                <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: 14 }}>
                  Recent transactions
                </h4>

                {userTransactions.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    No transactions.
                  </div>
                ) : (
                  userTransactions.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        borderRadius: 12,
                        border: "1px solid rgba(148,163,184,0.16)",
                        padding: 10,
                        marginBottom: 8,
                        fontSize: 12,
                        background:
                          safeLower(t.type) === "credit"
                            ? "rgba(34,197,94,0.10)"
                            : safeLower(t.type) === "withdrawal"
                            ? "rgba(239,68,68,0.10)"
                            : "rgba(59,130,246,0.10)",
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>
                        {t.type} • ₹{Math.abs(t.amount)} • {t.status}
                      </div>
                      {t.description ? (
                        <div style={{ marginTop: 4, opacity: 0.9 }}>
                          {t.description}
                        </div>
                      ) : null}
                      <div style={{ color: "#9ca3af", marginTop: 6 }}>
                        {formatDateTime(t.created_at)}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}