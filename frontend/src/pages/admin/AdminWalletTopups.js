// frontend/src/pages/admin/AdminWalletTopups.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

const wrapperStyle = {
  minHeight: "100vh",
  padding: "24px 16px",
  boxSizing: "border-box",
  background:
    "radial-gradient(1000px 500px at 10% 5%, rgba(56,189,248,0.12), transparent 50%), radial-gradient(900px 500px at 90% 20%, rgba(34,197,94,0.10), transparent 55%), linear-gradient(180deg, #020617 0%, #000 100%)",
  color: "#e5e7eb",
};

const cardStyle = {
  maxWidth: 1200,
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
  marginBottom: 12,
  gap: 12,
  flexWrap: "wrap",
};

const h2Style = {
  margin: 0,
  fontSize: 22,
  fontWeight: 800,
};

const subStyle = { fontSize: 12, color: "#9ca3af", marginTop: 6 };

const btn = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(2,6,23,0.35)",
  color: "#e5e7eb",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const exportBtn = {
  ...btn,
  border: "none",
  backgroundImage: "linear-gradient(90deg,#22c55e,#38bdf8)",
  color: "#020617",
};

const controlsRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 10,
};

const searchBox = {
  flex: 1,
  minWidth: 240,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(2,6,23,0.35)",
  color: "#e5e7eb",
  outline: "none",
};

const statsPill = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(2,6,23,0.35)",
  fontSize: 12,
  color: "#cbd5e1",
};

const tableWrapper = {
  marginTop: 12,
  borderRadius: 12,
  overflow: "hidden",
  border: "1px solid rgba(148,163,184,0.3)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const th = {
  textAlign: "left",
  padding: "9px 8px",
  background:
    "linear-gradient(180deg, rgba(30,64,175,0.95), rgba(15,23,42,0.98))",
  color: "#e5e7eb",
  borderBottom: "1px solid rgba(148,163,184,0.4)",
  whiteSpace: "nowrap",
};

const td = {
  padding: "8px 8px",
  borderBottom: "1px solid rgba(30,41,59,0.9)",
  verticalAlign: "top",
};

const statusPill = (status) => {
  let bg = "#4b5563";
  if (status === "success") bg = "#16a34a";
  else if (status === "pending") bg = "#f59e0b";
  else if (status === "rejected") bg = "#dc2626";
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    background: bg,
    color: "#f9fafb",
    textTransform: "capitalize",
  };
};

function safeStr(v) {
  return (v ?? "").toString().toLowerCase();
}

export default function AdminWalletTopups() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await api.get("/admin/wallet-topups");
        setRows(res.data.topups || []);
      } catch (e) {
        setErr(e.response?.data?.message || "Failed to load wallet top-ups.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const s = safeStr(q).trim();
    if (!s) return rows;

    return rows.filter((r) => {
      const hay =
        `${r.id} ${r.user_id} ${r.user_name} ${r.email} ${r.amount} ${r.status} ${r.payment_id} ${r.order_id} ${r.date}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  const totals = useMemo(() => {
    const totalCount = filteredRows.length;
    const successCount = filteredRows.filter((r) => r.status === "success").length;

    const successAmount = filteredRows
      .filter((r) => r.status === "success")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return { totalCount, successCount, successAmount };
  }, [filteredRows]);

  const handleExport = async () => {
    try {
      const res = await api.get("/admin/export/payments", {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to export CSV.");
    }
  };

  return (
    <div style={wrapperStyle}>
      <div style={cardStyle}>
        <div style={headerRow}>
          <div>
            <h2 style={h2Style}>Wallet Top-ups</h2>
            <div style={subStyle}>
              Cross-check user wallet payments against Razorpay dashboard.
            </div>

            <div style={controlsRow}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by user, email, amount, status, payment id..."
                style={searchBox}
              />

              <div style={statsPill}>
                Showing <b>{totals.totalCount}</b> | Success:{" "}
                <b>{totals.successCount}</b> | Success ₹{" "}
                <b>{totals.successAmount.toFixed(2)}</b>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              style={btn}
              onClick={() => navigate(-1)}
              type="button"
              title="Go back"
            >
              ← Back
            </button>
            <button style={exportBtn} onClick={handleExport} type="button">
              Export Payments CSV
            </button>
          </div>
        </div>

        {loading && <p style={{ fontSize: 13 }}>Loading…</p>}
        {err && (
          <p style={{ fontSize: 13, color: "#fecaca" }}>
            {err}
          </p>
        )}

        {!loading && !rows.length && !err && (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>
            No top-ups found yet.
          </p>
        )}

        {!!filteredRows.length && (
          <div style={tableWrapper}>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={th}>Date</th>
                    <th style={th}>User ID</th>
                    <th style={th}>User</th>
                    <th style={th}>Email</th>
                    <th style={th}>Amount</th>
                    <th style={th}>Status</th>
                    <th style={th}>Payment ID</th>
                    <th style={th}>Order ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.id}>
                      <td style={td}>
                        {r.date ? new Date(r.date).toLocaleString() : ""}
                      </td>
                      <td style={{ ...td, fontFamily: "monospace" }}>
                        {r.user_id}
                      </td>
                      <td style={td}>{r.user_name || `User #${r.user_id}`}</td>
                      <td style={td}>{r.email}</td>
                      <td style={td}>₹{Number(r.amount).toFixed(2)}</td>
                      <td style={td}>
                        <span style={statusPill(r.status)}>{r.status}</span>
                      </td>
                      <td style={{ ...td, fontFamily: "monospace" }}>
                        {r.payment_id}
                      </td>
                      <td style={{ ...td, fontFamily: "monospace" }}>
                        {r.order_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && rows.length > 0 && filteredRows.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 12 }}>
            No results for “{q}”.
          </p>
        ) : null}
      </div>
    </div>
  );
}