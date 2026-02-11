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
        if (!token) {
          setHistory([]);
          return;
        }

        const res = await axios.get(
          "http://localhost:5000/api/payments/wallet-history",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setHistory(res.data.history || []);
      } catch (err) {
        console.error("fetch history error", err);
        setHistory([]);
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

  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Prefer backend signed_amount; fallback to old logic using type + amount
  const getSignedAmount = (h) => {
    if (h && h.signed_amount !== undefined && h.signed_amount !== null) {
      return toNumber(h.signed_amount);
    }
    const amt = toNumber(h?.amount);
    const type = String(h?.type || "").toLowerCase();
    if (type === "credit") return +amt;
    if (type === "debit" || type === "withdrawal") return -amt;
    return 0;
  };

  const getTitle = (h) => {
    const type = String(h?.type || "").toLowerCase();
    if (type === "credit") return "Added to wallet";
    if (type === "withdrawal") return "Withdrawal";
    return "Tournament fee deducted";
  };

  const getRowDate = (h) => h?.created_at || h?.createdAt || h?.date || null;

  return (
    <div style={{ padding: 20 }}>
      <h2>Transaction history</h2>

      {loading ? (
        <div>Loading…</div>
      ) : history.length === 0 ? (
        <div>No successful transactions yet</div>
      ) : (
        <div style={{ marginTop: 12 }}>
          {history.map((h) => {
            const signed = getSignedAmount(h);
            const isCredit = signed > 0;

            const displayAmount = Math.abs(signed).toFixed(2);
            const amountColor = isCredit ? "#22c55e" : "#ef4444";

            return (
              <div
                key={h.id || `${getRowDate(h)}-${h.amount}-${h.type}`}
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
                  <div style={{ fontWeight: 700 }}>{getTitle(h)}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {h.description || ""}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {fmtDate(getRowDate(h))}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: amountColor }}>
                    {signed >= 0 ? "+" : "-"} ₹{displayAmount}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {h.status || ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}