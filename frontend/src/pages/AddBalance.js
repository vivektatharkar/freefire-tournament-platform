// frontend/src/pages/AddBalance.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import bg from "../assets/bg.jpg";

export default function AddBalance() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  const MIN_AMOUNT = 50;
  const presets = [50, 100, 200, 500, 1000];

  const handleChoose = (v) => {
    setMsg("");
    setIsError(false);
    setAmount(v);
  };

  const handleCustomChange = (e) => {
    setMsg("");
    setIsError(false);

    const value = e.target.value;

    if (value === "") {
      setAmount("");
      return;
    }

    let num = Number(value);
    if (Number.isNaN(num)) return;
    if (num < MIN_AMOUNT) num = MIN_AMOUNT;

    setAmount(num);
  };

  const openRazorpay = async (order, key) => {
    return new Promise((resolve, reject) => {
      const options = {
        key,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Freefire Tournament",
        description: "Wallet top-up",
        order_id: String(order.id), // force string (safe)
        handler: function (response) {
          resolve(response);
        },
        modal: {
          ondismiss: function () {
            reject(new Error("Payment cancelled by user"));
          },
        },
        prefill: { email: "", contact: "" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    });
  };

  const handlePay = async () => {
    setMsg("");
    setIsError(false);

    const token = localStorage.getItem("token");
    if (!token) {
      setIsError(true);
      setMsg("Not authenticated. Please login again.");
      return;
    }

    const numericAmount = Number(amount);
    if (!numericAmount || Number.isNaN(numericAmount)) {
      setIsError(true);
      setMsg("Please enter a valid amount.");
      return;
    }
    if (numericAmount < MIN_AMOUNT) {
      setIsError(true);
      setMsg(`Minimum top-up amount is ₹${MIN_AMOUNT}.`);
      return;
    }

    setLoading(true);
    let createdOrder = null;

    try {
      const res = await api.post("/payments/create-order", { amount: numericAmount });
      const { order, key } = res.data || {};
      if (!order || !order.id) throw new Error("Failed to create payment order");
      createdOrder = order;

      if (typeof window.Razorpay === "undefined") {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = resolve;
          s.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
          document.body.appendChild(s);
        });
      }

      const response = await openRazorpay(order, key || process.env.REACT_APP_RAZORPAY_KEY);

      // Debug: check what Razorpay returned (important)
      console.log("Razorpay success response:", response);

      const roid = response?.razorpay_order_id;
      const rpid = response?.razorpay_payment_id;
      const rsig = response?.razorpay_signature;

      // If these are missing, verify will fail; show clear error.
      if (!roid || !rpid || !rsig) {
        throw new Error(
          "Razorpay response missing order_id/signature. Check that order_id is passed correctly."
        );
      }

      const verifyRes = await api.post("/payments/verify", {
        razorpay_order_id: roid,
        razorpay_payment_id: rpid,
        razorpay_signature: rsig,
      });

      if (verifyRes.data && verifyRes.data.ok) {
        setMsg(verifyRes.data.message || "Payment successful. Amount has been added to your wallet.");
        setIsError(false);

        const userRaw = localStorage.getItem("user");
        if (userRaw) {
          try {
            const u = JSON.parse(userRaw);
            if (verifyRes.data.newBalance !== undefined) {
              u.wallet_balance = verifyRes.data.newBalance;
              localStorage.setItem("user", JSON.stringify(u));
            }
          } catch {}
        }

        setTimeout(() => navigate("/profile"), 900);
      } else {
        setIsError(true);
        setMsg(verifyRes.data?.message || "Verification failed. No amount has been added.");
      }
    } catch (err) {
      if (err?.message === "Payment cancelled by user" && createdOrder?.id) {
        try {
          await api.post("/payments/cancel-topup", { orderId: createdOrder.id });
        } catch {}
      }

      console.error("AddBalance error:", err?.response?.data || err.message);
      setIsError(true);
      setMsg(err?.response?.data?.message || err.message || "Payment failed or cancelled");
    } finally {
      setLoading(false);
    }
  };

  const pageStyle = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundImage: `url(${bg})`,
    backgroundSize: "cover",
    padding: 20,
  };

  const card = {
    width: 420,
    maxWidth: "95%",
    background: "rgba(10,14,20,0.9)",
    padding: 20,
    borderRadius: 14,
    color: "#fff",
  };

  const numericAmount = Number(amount);
  const invalidAmount = !numericAmount || Number.isNaN(numericAmount) || numericAmount < MIN_AMOUNT;

  return (
    <div style={pageStyle}>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Add Balance</h2>
        <p style={{ color: "#aab3bf" }}>
          Minimum top-up is ₹{MIN_AMOUNT}. Choose or enter a higher amount.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => handleChoose(p)}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: Number(amount) === p ? "2px solid #60a5fa" : "1px solid rgba(255,255,255,0.06)",
                background: Number(amount) === p ? "rgba(96,165,250,0.12)" : "transparent",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              ₹{p}
            </button>
          ))}

          <div style={{ flex: "1 1 100%", marginTop: 8 }}>
            <label style={{ fontSize: 13, color: "#9ca3af" }}>
              Custom amount (₹{MIN_AMOUNT}+)
            </label>
            <input
              value={amount}
              onChange={handleCustomChange}
              type="number"
              min={MIN_AMOUNT}
              step="1"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.06)",
                marginTop: 6,
                color: "#fff",
                background: "transparent",
              }}
            />
          </div>
        </div>

        {msg && (
          <div
            style={{
              padding: 10,
              borderRadius: 8,
              background: isError ? "#7f1d1d" : "#063b17",
              color: "#fff",
              marginBottom: 12,
            }}
          >
            {msg}
          </div>
        )}

        {invalidAmount && (
          <div style={{ fontSize: 11, color: "#fbbf24", marginBottom: 6 }}>
            Enter at least ₹{MIN_AMOUNT} to enable payment.
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handlePay}
            disabled={loading || invalidAmount}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              cursor: loading || invalidAmount ? "not-allowed" : "pointer",
              opacity: loading || invalidAmount ? 0.6 : 1,
              background: "linear-gradient(90deg,#06b6d4,#3b82f6)",
              color: "#021124",
              fontWeight: 700,
            }}
          >
            {loading ? "Processing…" : `Pay ₹${Number(amount || 0).toFixed(2)}`}
          </button>

          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.06)",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>

        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 12 }}>
          By proceeding you will be redirected to Razorpay. The backend verifies the signature before adding money.
        </p>
      </div>
    </div>
  );
}