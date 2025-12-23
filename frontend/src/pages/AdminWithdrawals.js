// frontend/src/pages/AdminWithdrawals.js
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:5000"; // change if needed

export default function AdminWithdrawals() {
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

  // search filter
  const list = (allRows || []).filter((w) => {
    const q = search.trim().toLowerCase();
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
    return fields.some((f) =>
      String(f || "")
        .toLowerCase()
        .includes(q)
    );
  });

  const openUserProfile = async (userId) => {
    setSelectedUserId(userId);
    setSelectedUserData(null);
    setUserError("");
    setLoadingUser(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE}/api/admin/users/${userId}/activity`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = res.data || {};
      data.transactions = Array.isArray(data.transactions)
        ? data.transactions
        : [];
      setSelectedUserData(data);
    } catch (e) {
      console.error("load user activity error", e);
      setUserError(
        e.response?.data?.message || "Failed to load user profile"
      );
    } finally {
      setLoadingUser(false);
    }
  };

  const closeUserProfile = () => {
    setSelectedUserId(null);
    setSelectedUserData(null);
    setUserError("");
  };

  const goBack = () => {
    window.history.back();
  };

  const userTransactions = Array.isArray(
    selectedUserData?.transactions
  )
    ? selectedUserData.transactions
    : [];

  // Try to use total sent from backend, otherwise compute from transactions.
  const backendTournamentTotal =
    selectedUserData?.tournament_deduction ??
    selectedUserData?.tournamentDeduction ??
    selectedUserData?.tournament_total ??
    0;

  // If backend did not send any total, compute from matching transactions.
  const computedTournamentTotal = userTransactions
    .filter((t) => {
      const type = String(t.type || "").toLowerCase();
      // match common possibilities: "tournament", "tournament_fee", "tournament-deduction"
      return (
        type.includes("tournament") ||
        type.includes("fee") ||
        type.includes("deduction")
      );
    })
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  const tournamentTotal =
    backendTournamentTotal && Number(backendTournamentTotal) !== 0
      ? backendTournamentTotal
      : computedTournamentTotal;

  return (
    <div style={{ padding: 20, position: "relative" }}>
      {/* Back button */}
      <button
        onClick={goBack}
        style={{
          marginBottom: 10,
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid #9ca3af",
          background: "#111827",
          color: "#e5e7eb",
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        ← Back
      </button>

      <h2 style={{ marginBottom: 10 }}>Withdrawal Requests</h2>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, phone, UPI, status, type..."
        style={{
          marginBottom: 12,
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid #9ca3af",
          width: "100%",
          maxWidth: 360,
          fontSize: 13,
        }}
      />

      {list.length === 0 ? (
        <p>No withdrawal requests.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 900,
            }}
          >
            <thead>
              <tr style={{ background: "#111827", color: "#e5e7eb" }}>
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
                <tr key={w.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td
                    style={{ ...td, cursor: "pointer", color: "#60a5fa" }}
                    onClick={() => openUserProfile(w.user_id)}
                    title="Click to view full profile"
                  >
                    {w.user_name || "-"}
                  </td>
                  <td style={td}>{w.user_id}</td>
                  <td style={td}>{w.email || "-"}</td>
                  <td style={td}>{w.phone || "-"}</td>
                  <td style={td}>{w.type || "withdrawal"}</td>
                  <td style={td}>₹{Math.abs(Number(w.amount) || 0)}</td>
                  <td style={td}>{w.upi_id}</td>
                  <td style={td}>{w.status}</td>
                  <td style={td}>{formatDateTime(w.created_at)}</td>
                  <td style={td}>
                    {w.status === "pending" ? (
                      <>
                        <button
                          onClick={() => act(w.id, "approve")}
                          style={btnApprove}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => act(w.id, "reject")}
                          style={btnReject}
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span>{w.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* user profile side panel */}
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
              width: 380,
              height: "100vh",
              background: "#020617",
              color: "#e5e7eb",
              boxShadow: "-8px 0 30px rgba(0,0,0,0.7)",
              padding: 16,
              zIndex: 200,
              overflowY: "auto",
            }}
          >
            <button
              onClick={closeUserProfile}
              style={{
                border: "none",
                background: "transparent",
                color: "#9ca3af",
                fontSize: 18,
                float: "right",
                cursor: "pointer",
              }}
            >
              ×
            </button>

            {loadingUser ? (
              <p style={{ marginTop: 40 }}>Loading user profile…</p>
            ) : userError ? (
              <p style={{ marginTop: 40, color: "#f97316" }}>{userError}</p>
            ) : !selectedUserData ? (
              <p style={{ marginTop: 40 }}>No data.</p>
            ) : (
              <>
                <h3 style={{ marginTop: 32, marginBottom: 4 }}>
                  {selectedUserData.user?.name || "User"} (ID{" "}
                  {selectedUserData.user?.id})
                </h3>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>
                  {selectedUserData.user?.email}
                  <br />
                  {selectedUserData.user?.phone}
                </div>

                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    borderRadius: 10,
                    background:
                      "linear-gradient(120deg, rgba(34,197,94,0.15), rgba(15,23,42,1))",
                    border: "1px solid #16a34a",
                  }}
                >
                  <div style={{ fontSize: 14, marginBottom: 4 }}>
                    Wallet balance: ₹{selectedUserData.wallet_balance ?? 0}
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Total credit: ₹{selectedUserData.total_credit ?? 0}
                    <br />
                    Total debit: ₹{selectedUserData.total_debit ?? 0}
                    <br />
                    Tournament deductions: ₹{tournamentTotal}
                  </div>
                </div>

                <h4
                  style={{ marginTop: 18, marginBottom: 6, fontSize: 14 }}
                >
                  Recent transactions
                </h4>
                {userTransactions.length === 0 && (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    No transactions.
                  </div>
                )}
                {userTransactions.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      borderRadius: 8,
                      border: "1px solid #1f2937",
                      padding: 8,
                      marginBottom: 6,
                      fontSize: 12,
                      background:
                        t.type === "credit"
                          ? "rgba(34,197,94,0.15)"
                          : t.type === "withdrawal"
                          ? "rgba(248,113,113,0.12)"
                          : "rgba(59,130,246,0.1)",
                    }}
                  >
                    <div>
                      <strong>{t.type}</strong> • ₹{Math.abs(t.amount)} •{" "}
                      {t.status}
                    </div>
                    {t.description && (
                      <div style={{ marginTop: 2 }}>{t.description}</div>
                    )}
                    <div
                      style={{
                        color: "#9ca3af",
                        marginTop: 2,
                      }}
                    >
                      {formatDateTime(t.created_at)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const th = {
  padding: "8px 10px",
  textAlign: "left",
  fontSize: 13,
  whiteSpace: "nowrap",
};

const td = {
  padding: "8px 10px",
  fontSize: 13,
  whiteSpace: "nowrap",
};

const btnApprove = {
  marginRight: 6,
  padding: "4px 8px",
  fontSize: 12,
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  background: "#22c55e",
  color: "#022c22",
};

const btnReject = {
  padding: "4px 8px",
  fontSize: 12,
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  background: "#ef4444",
  color: "#fee2e2",
};