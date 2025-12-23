// frontend/src/pages/Transactions.js
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Transactions() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get("http://localhost:5000/api/payments/wallet-history", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setHistory(res.data.history || []);
      } catch (err) {
        console.error("fetch history error", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const fmtDate = (s) => {
    if (!s) return "-";
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Transaction history</h2>
      {loading ? (
        <div>Loading…</div>
      ) : history.length === 0 ? (
        <div>No successful transactions yet</div>
      ) : (
        <div style={{ marginTop: 12 }}>
          {history.map((h) => (
            <div
              key={h.id || `${h.createdAt}-${h.amount}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: 10,
                borderRadius: 8,
                background: "#0f172a",
                marginBottom: 8,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>
                  {h.type === "credit" ? "Added to wallet" : "Tournament fee deducted"}
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>{h.description || ""}</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>{fmtDate(h.createdAt)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800 }}>{h.type === "credit" ? "+" : "-"} ₹{Number(h.amount || 0).toFixed(2)}</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>{h.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}