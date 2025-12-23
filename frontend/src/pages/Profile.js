// frontend/src/pages/Profile.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";

const pageStyle = {
  minHeight: "100vh",
  margin: 0,
  padding: "32px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundImage: `url(${bg})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  position: "relative",
};

const overlayStyle = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at top, rgba(15,23,42,0.55), rgba(15,23,42,0.95))",
};

const cardStyle = {
  position: "relative",
  zIndex: 1,
  width: "620px",
  maxWidth: "100%",
  background:
    "linear-gradient(145deg, rgba(15,23,42,0.98), rgba(17,24,39,0.96))",
  borderRadius: "30px",
  padding: "26px 26px 20px",
  boxShadow:
    "0 30px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(148,163,184,0.15)",
  color: "#f9fafb",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

/* ---------------- TOP BAR ---------------- */

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
};

const topBarLeft = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const backBtn = {
  width: 30,
  height: 30,
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.7)",
  background: "rgba(15,23,42,0.95)",
  color: "#e5e7eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 16,
  boxShadow: "0 6px 14px rgba(15,23,42,0.9)",
};

const topTitle = { fontSize: 20, fontWeight: 700 };
const topBadge = {
  fontSize: 11,
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.5)",
  color: "#e5e7eb",
  background:
    "linear-gradient(120deg, rgba(15,23,42,0.8), rgba(31,41,55,0.9))",
};

/* ---------------- HEADER ---------------- */

const headerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "16px",
  borderRadius: 22,
  background:
    "linear-gradient(130deg, rgba(15,23,42,0.9), rgba(30,64,175,0.35))",
  border: "1px solid rgba(129,140,248,0.35)",
};

const avatarWrapper = { position: "relative" };
const avatarGlow = {
  position: "absolute",
  inset: -5,
  borderRadius: "999px",
  background:
    "conic-gradient(from 180deg, rgba(96,165,250,0.2), rgba(244,114,182,0.4), rgba(96,165,250,0.2))",
  filter: "blur(8px)",
  opacity: 0.9,
};

const avatarStyle = {
  position: "relative",
  width: 60,
  height: 60,
  borderRadius: "50%",
  background:
    "conic-gradient(from 180deg, #f97316, #22c55e, #3b82f6, #a855f7, #f97316)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#0f172a",
  fontWeight: 800,
  fontSize: 26,
  boxShadow: "0 10px 30px rgba(15,23,42,0.9)",
};

const headerTextWrap = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const nameStyle = { fontSize: 19, fontWeight: 700 };
const emailStyle = { fontSize: 13, color: "#cbd5f5" };
const phoneStyle = { fontSize: 12, color: "#a5b4fc" };
const idStyle = { fontSize: 11, color: "#9ca3af" };

const gameIdChip = {
  marginTop: 4,
  alignSelf: "flex-start",
  fontSize: 11,
  padding: "3px 9px",
  borderRadius: 999,
  backgroundColor: "rgba(15,23,42,0.85)",
  border: "1px solid rgba(148,163,184,0.6)",
  color: "#e5e7eb",
};

/* ------------- WALLET CARD ---------------- */

const walletCard = {
  marginTop: 4,
  padding: "10px 14px",
  borderRadius: 18,
  background:
    "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(8,47,73,0.9))",
  border: "1px solid rgba(34,197,94,0.6)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 14,
  gap: 10,
};

const walletLeft = { display: "flex", flexDirection: "column" };
const walletLabel = { color: "#bbf7d0", letterSpacing: 0.3 };
const walletAmount = { fontSize: 20, fontWeight: 700, color: "#4ade80" };

const walletBtn = {
  padding: "7px 12px",
  borderRadius: 999,
  border: "none",
  background: "linear-gradient(90deg,#22c55e,#16a34a)",
  color: "#0f172a",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(22,163,74,0.5)",
};

const withdrawBtn = {
  ...walletBtn,
  background: "linear-gradient(90deg,#fb7185,#f43f5e)",
};

/* small area under wallet for last updated + refresh */

const walletMetaRow = {
  marginTop: 4,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 11,
  color: "#9ca3af",
};

const refreshBtn = {
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.7)",
  backgroundColor: "rgba(15,23,42,0.9)",
  color: "#e5e7eb",
  fontSize: 11,
  cursor: "pointer",
};

/* ---------------- WITHDRAWAL FORM ---------------- */

const withdrawSection = {
  marginTop: 12,
  padding: "16px",
  background: "rgba(251,113,133,0.1)",
  border: "1px solid rgba(251,113,133,0.3)",
  borderRadius: 16,
  gap: 10,
};

const withdrawTitle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#fee2e2",
  marginBottom: 8,
};

/* ---------------- FORM / MESSAGES ---------------- */

const msgBase = {
  margin: 0,
  padding: "8px 10px",
  borderRadius: 8,
  fontSize: 13,
  textAlign: "center",
};
const msgError = { ...msgBase, backgroundColor: "#fee2e2", color: "#b91c1c" };
const msgSuccess = { ...msgBase, backgroundColor: "#dcfce7", color: "#166534" };

const sectionTitle = {
  marginTop: 4,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "#9ca3af",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 10,
  marginTop: 6,
};

const labelStyle = { fontSize: 13, marginBottom: 4, display: "block" };
const inputStyle = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 12,
  border: "1px solid #4b5563",
  backgroundColor: "#020617",
  color: "#f9fafb",
  fontSize: 14,
  outline: "none",
  boxShadow: "0 0 0 1px rgba(15,23,42,0.9)",
};

const inputReadOnlyStyle = {
  ...inputStyle,
  opacity: 0.7,
  cursor: "default",
};

const buttonRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  marginTop: 10,
};

const logoutBtn = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 999,
  border: "1px solid #4b5563",
  background:
    "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,64,175,0.5))",
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 14,
};

const editBtn = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 999,
  border: "none",
  background:
    "linear-gradient(90deg, rgba(59,130,246,0.9), rgba(129,140,248,0.95))",
  color: "#0f172a",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "0 10px 25px rgba(59,130,246,0.55)",
};

const saveBtn = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 999,
  border: "none",
  backgroundImage: "linear-gradient(90deg,#22c55e,#4ade80)",
  color: "#0f172a",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "0 10px 25px rgba(22,163,74,0.45)",
};

const cancelBtn = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 999,
  border: "1px solid #4b5563",
  backgroundColor: "transparent",
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 14,
};

/* ---------------- HISTORY ---------------- */

const historySection = {
  marginTop: 10,
  paddingTop: 10,
  borderTop: "1px solid rgba(31,41,55,0.9)",
};

const historyTitleRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 4,
};

const historyTitle = { fontSize: 13, fontWeight: 600 };
const historyButtons = { display: "flex", gap: 6 };

const smallHeaderBtn = {
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.6)",
  backgroundColor: "rgba(15,23,42,0.9)",
  color: "#e5e7eb",
  fontSize: 11,
  cursor: "pointer",
};

const historyList = {
  maxHeight: "190px",
  overflowY: "auto",
  paddingRight: 4,
};

const historyItem = {
  padding: "7px 9px",
  borderRadius: 12,
  backgroundColor: "#020617",
  border: "1px solid #1f2937",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 12,
  marginBottom: 6,
};

const historyLeft = { display: "flex", flexDirection: "column", gap: 2 };
const historyDesc = { color: "#e5e7eb" };
const historyDate = { color: "#6b7280", fontSize: 11 };
const historyAmountAdd = { color: "#4ade80", fontWeight: 600 };
const historyAmountSub = { color: "#fb7185", fontWeight: 600 };

export default function Profile() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [freefireId, setFreefireId] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState(null);

  const [walletBalance, setWalletBalance] = useState(0);
  const [walletHistory, setWalletHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  const [walletLastUpdated, setWalletLastUpdated] = useState(null);

  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [originalProfile, setOriginalProfile] = useState(null);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId, setUpiId] = useState("");

  const navigate = useNavigate();
  const avatarLetter = name?.[0]?.toUpperCase() || "?";

  const refreshUserFromBackend = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await axios.get("http://localhost:5000/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const u = res.data.user || res.data;
    if (!u) return;

    setName(u.name || "");
    setPhone(u.phone || "");
    setEmail(u.email || "");
    setFreefireId(u.game_id || u.freefireId || "");
    setUserId(u.id || null);

    const wb = Number(
      u.wallet_balance ?? u.walletBalance ?? u.wallet ?? 0
    );
    setWalletBalance(Number.isNaN(wb) ? 0 : wb);

    setOriginalProfile({
      name: u.name || "",
      freefireId: u.game_id || u.freefireId || "",
    });

    localStorage.setItem("user", JSON.stringify(u));
  };

  const loadWalletHistory = async (token) => {
    try {
      setHistoryLoading(true);
      const res = await axios.get(
        "http://localhost:5000/api/payments/wallet-history",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setWalletHistory(res.data.history || res.data || []);
      setHistoryExpanded(true);
    } catch (err) {
      console.error("wallet history load error", err?.response?.data || err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const doWalletRefresh = async () => {
    setIsError(false);
    setMsg("");
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      await refreshUserFromBackend();
      await loadWalletHistory(token);
      setWalletLastUpdated(new Date());
      setMsg("Wallet refreshed");
    } catch (err) {
      console.error("wallet refresh error", err?.response?.data || err);
      setIsError(true);
      setMsg("Failed to refresh wallet");
    }
  };

  useEffect(() => {
    const local = localStorage.getItem("user");
    if (local) {
      try {
        const u = JSON.parse(local);
        if (u?.id) setUserId(u.id);
        if (u?.name) setName(u.name);
        if (u?.phone) setPhone(u.phone);
        if (u?.email) setEmail(u.email);
        if (u?.game_id || u?.freefireId)
          setFreefireId(u.game_id || u.freefireId);

        const rawLocalWB =
          u?.wallet_balance ?? u?.walletBalance ?? u?.wallet ?? 0;
        const localWB = Number(rawLocalWB);
        setWalletBalance(Number.isNaN(localWB) ? 0 : localWB);

        setOriginalProfile({
          name: u?.name || "",
          freefireId: u?.game_id || u?.freefireId || "",
        });
      } catch {
        // ignore
      }
    }

    const fetchProfileAndHistory = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        await refreshUserFromBackend();
        await loadWalletHistory(token);
        setWalletLastUpdated(new Date());
      } catch (err) {
        console.error("profile/wallet load error", err?.response?.data || err);
        setIsError(true);
        setMsg("Failed to load profile. Please login again.");
      }
    };

    fetchProfileAndHistory();
  }, [navigate]);

  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(""), 2000);
    return () => clearTimeout(timer);
  }, [msg]);

  const submitWithdraw = async () => {
    try {
      setMsg("");
      setIsError(false);

      const token = localStorage.getItem("token");
      if (!token) {
        setIsError(true);
        setMsg("Please login first");
        return;
      }

      if (!withdrawAmount || !upiId.trim()) {
        setIsError(true);
        setMsg("Please enter amount and UPI ID");
        return;
      }

      const res = await axios.post(
        "http://localhost:5000/api/payments/withdraw",
        {
          amount: Number(withdrawAmount),
          upi_id: upiId.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await refreshUserFromBackend();
      await loadWalletHistory(token);
      setWalletLastUpdated(new Date());

      setMsg(res.data.message || "Withdrawal requested successfully");
      setShowWithdraw(false);
      setWithdrawAmount("");
      setUpiId("");
    } catch (err) {
      console.error("withdraw error", err?.response?.data || err);
      setIsError(true);
      setMsg(err.response?.data?.message || "Withdrawal failed");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isEditing) return;

    setMsg("");
    setIsError(false);
    setLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      setIsError(true);
      setMsg("Not authenticated");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name,
        freefireId: freefireId || "",
        game_id: freefireId || "",
      };

      const res = await axios.put(
        "http://localhost:5000/api/users/me",
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updatedUser = res.data.user || res.data;
      if (updatedUser) {
        localStorage.setItem("user", JSON.stringify(updatedUser));
        const rawWB =
          updatedUser.wallet_balance ??
          updatedUser.walletBalance ??
          updatedUser.wallet ??
          0;
        const wb = Number(rawWB);
        setWalletBalance(Number.isNaN(wb) ? 0 : wb);

        setName(updatedUser.name || "");
        setPhone(updatedUser.phone || "");
        setFreefireId(updatedUser.game_id || updatedUser.freefireId || "");
        setEmail(updatedUser.email || "");
        setUserId(updatedUser.id || userId);

        setOriginalProfile({
          name: updatedUser.name || "",
          freefireId: updatedUser.game_id || updatedUser.freefireId || "",
        });
      }

      setIsError(false);
      setMsg(res.data.message || "Profile updated successfully");
      setIsEditing(false);
    } catch (err) {
      console.error("profile update error", err?.response?.data || err.message);
      setIsError(true);
      setMsg(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const goBack = () => navigate(-1);
  const handleAddBalance = () => navigate("/add-balance");
  const toggleHistory = () => setHistoryExpanded((v) => !v);

  const formatDate = (str) => {
    if (!str) return "";
    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return str;
    return d.toLocaleString();
  };

  const formatLastUpdated = () => {
    if (!walletLastUpdated) return "Never";
    return walletLastUpdated.toLocaleTimeString();
  };

  const startEditing = () => {
    setMsg("");
    setIsError(false);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (originalProfile) {
      setName(originalProfile.name || "");
      setFreefireId(originalProfile.freefireId || "");
    }
    setIsEditing(false);
  };

  const safeWallet = Number(walletBalance || 0);

  return (
    <div style={pageStyle}>
      <div style={overlayStyle} />

      <form style={cardStyle} onSubmit={handleSave}>
        <div style={topBar}>
          <div style={topBarLeft}>
            <button
              type="button"
              style={backBtn}
              onClick={goBack}
              aria-label="Go back"
            >
              ←
            </button>
            <div style={topTitle}>Player profile</div>
          </div>
          <div style={topBadge}>Freefire Tournament • Profile</div>
        </div>

        <div style={headerStyle}>
          <div style={avatarWrapper}>
            <div style={avatarGlow} />
            <div style={avatarStyle}>{avatarLetter}</div>
          </div>

          <div style={headerTextWrap}>
            <div style={nameStyle}>{name || "Game name"}</div>
            <div style={emailStyle}>{email || "—"}</div>
            {phone ? <div style={phoneStyle}>Phone: {phone}</div> : null}
            <div style={idStyle}>User ID: {userId ?? "—"}</div>
            {freefireId ? (
              <div style={gameIdChip}>Game ID: {freefireId}</div>
            ) : null}

            <div style={walletCard}>
              <div style={walletLeft}>
                <span style={walletLabel}>Wallet balance</span>
                <span style={walletAmount}>₹ {safeWallet.toFixed(2)}</span>
              </div>
              <button
                type="button"
                style={walletBtn}
                onClick={handleAddBalance}
              >
                + Add balance
              </button>
              <button
                type="button"
                style={withdrawBtn}
                onClick={() => setShowWithdraw(true)}
              >
                Withdraw
              </button>
            </div>

            <div style={walletMetaRow}>
              <span>Last updated: {formatLastUpdated()}</span>
              <button type="button" style={refreshBtn} onClick={doWalletRefresh}>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {msg && <p style={isError ? msgError : msgSuccess}>{msg}</p>}

        {showWithdraw && (
          <div style={withdrawSection}>
            <div style={withdrawTitle}>Request Withdrawal</div>
            <div>
              <label style={labelStyle}>Amount (₹)</label>
              <input
                style={inputStyle}
                placeholder="Enter amount"
                type="number"
                min="10"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>UPI ID</label>
              <input
                style={inputStyle}
                placeholder="yourname@paytm / 1234567890@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
            </div>
            <div style={buttonRow}>
              <button
                type="button"
                style={cancelBtn}
                onClick={() => {
                  setShowWithdraw(false);
                  setWithdrawAmount("");
                  setUpiId("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                style={saveBtn}
                onClick={submitWithdraw}
              >
                Submit Withdrawal
              </button>
            </div>
          </div>
        )}

        <div style={sectionTitle}>Profile details</div>
        <div style={formGrid}>
          <div>
            <label style={labelStyle}>Game name</label>
            <input
              style={isEditing ? inputStyle : inputReadOnlyStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={!isEditing}
              placeholder="Your in-game name"
            />
          </div>

          <div>
            <label style={labelStyle}>Freefire ID</label>
            <input
              style={isEditing ? inputStyle : inputReadOnlyStyle}
              value={freefireId}
              onChange={(e) => setFreefireId(e.target.value)}
              readOnly={!isEditing}
              placeholder="Your Freefire UID"
            />
          </div>
        </div>

        <div style={buttonRow}>
          <button type="button" style={logoutBtn} onClick={logout}>
            Logout
          </button>

          {!isEditing ? (
            <button type="button" style={editBtn} onClick={startEditing}>
              Edit profile
            </button>
          ) : (
            <>
              <button
                type="button"
                style={cancelBtn}
                onClick={cancelEditing}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" style={saveBtn} disabled={loading}>
                {loading ? "Saving..." : "Save changes"}
              </button>
            </>
          )}
        </div>

        <div style={historySection}>
          <div style={historyTitleRow}>
            <div style={historyTitle}>Wallet history</div>
            <div style={historyButtons}>
              <button
                type="button"
                style={smallHeaderBtn}
                onClick={toggleHistory}
              >
                {historyExpanded ? "Hide history" : "Show history"}
              </button>
              <button
                type="button"
                style={smallHeaderBtn}
                onClick={handleAddBalance}
              >
                + Add balance
              </button>
              {historyLoading && (
                <span
                  style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}
                >
                  Loading…
                </span>
              )}
            </div>
          </div>

          {historyExpanded && (
            <div style={historyList}>
              {walletHistory.length === 0 && !historyLoading && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  No wallet activity yet.
                </div>
              )}

              {walletHistory.map((item) => {
                const amt = Number(item.amount || 0);
                const isAdd = item.type === "credit";
                const absolute = Math.abs(amt).toFixed(2);
                const isPending = item.status === "pending";
                const created =
                  item.created_at || item.createdAt || item.date;

                return (
                  <div
                    key={item.id || `${created}-${amt}`}
                    style={historyItem}
                  >
                    <div style={historyLeft}>
                      <span style={historyDesc}>
                        {item.description ||
                          item.reason ||
                          item.type ||
                          "Entry"}
                      </span>
                      <span style={historyDate}>{formatDate(created)}</span>
                      <span style={historyDate}>
                        Status: {item.status || "unknown"}
                      </span>
                    </div>
                    <div style={isAdd ? historyAmountAdd : historyAmountSub}>
                      {isAdd ? "+" : "-"}₹ {absolute}
                      {isPending && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "#facc15",
                            marginLeft: 6,
                          }}
                        >
                          (Pending)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}