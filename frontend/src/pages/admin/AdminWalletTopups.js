// frontend/src/pages/admin/AdminWalletTopups.js
import React, { useEffect, useState } from "react";
import api from "../../api";

const wrapperStyle = {
  minHeight: "100vh",
  padding: "24px 16px",
  boxSizing: "border-box",
  background:
    "radial-gradient(circle at top, #1e293b 0, #020617 55%, #000 100%)",
  color: "#e5e7eb",
};

const cardStyle = {
  maxWidth: 1200,
  margin: "0 auto",
  background: "rgba(15,23,42,0.96)",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 18px 40px rgba(0,0,0,0.75)",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
  gap: 8,
};

const h2Style = {
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
};

const exportBtn = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "none",
  backgroundImage: "linear-gradient(90deg,#22c55e,#38bdf8)",
  color: "#020617",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const tableWrapper = {
  marginTop: 8,
  borderRadius: 10,
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
  padding: "8px 6px",
  background:
    "linear-gradient(180deg, rgba(30,64,175,0.95), rgba(15,23,42,0.98))",
  color: "#e5e7eb",
  borderBottom: "1px solid rgba(148,163,184,0.4)",
  whiteSpace: "nowrap",
};

const td = {
  padding: "7px 6px",
  borderBottom: "1px solid rgba(30,41,59,0.9)",
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

export default function AdminWalletTopups() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await api.get("/admin/wallet-topups");
        setRows(res.data.topups || []);
      } catch (e) {
        setErr(
          e.response?.data?.message || "Failed to load wallet top-ups."
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
      setErr(
        e.response?.data?.message || "Failed to export CSV."
      );
    }
  };

  return (
    <div style={wrapperStyle}>
      <div style={cardStyle}>
        <div style={headerRow}>
          <div>
            <h2 style={h2Style}>Wallet Top-ups</h2>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              Cross-check user wallet payments against Razorpay dashboard.
            </div>
          </div>
          <button style={exportBtn} onClick={handleExport}>
            Export Payments CSV
          </button>
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

        {!!rows.length && (
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
                  {rows.map((r) => (
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
      </div>
    </div>
  );
}