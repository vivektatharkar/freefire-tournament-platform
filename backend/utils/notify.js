// backend/utils/notify.js
import Notification from "../models/Notification.js";

function sanitizeMsg(s) {
  // Convert to string, remove CR/LF, trim.
  const txt = String(s || "")
    .replace(/ /g, " ")
    .replace(/ /g, " ")
    .trim();

  // Prevent huge rows (TEXT can store big, but UI/DB shouldn't be abused)
  return txt.length > 500 ? txt.slice(0, 500) + "..." : txt;
}

/**
 * Core notifier (keep same signature to avoid breaking your flow)
 */
export async function notifyUser(userId, type, message, t = null) {
  return Notification.create(
    {
      user_id: userId,
      type: String(type || "general").slice(0, 50),
      message: sanitizeMsg(message),
      read_flag: false,
    },
    t ? { transaction: t } : {}
  );
}

/**
 * Convenience wrappers (optional to use)
 */
export async function notifyGeneral(userId, message, t = null) {
  return notifyUser(userId, "general", message, t);
}

export async function notifyWalletCredit(userId, amount, note = "", t = null) {
  const a = Number(amount || 0);
  const msg = `₹${a} added to your wallet.${note ? ` Note: ${note}` : ""}`;
  return notifyUser(userId, "wallet_credit", msg, t);
}

export async function notifyWalletDebit(userId, amount, note = "", t = null) {
  const a = Number(amount || 0);
  const msg = `₹${a} deducted from your wallet.${note ? ` Note: ${note}` : ""}`;
  return notifyUser(userId, "wallet_debit", msg, t);
}

export async function notifyWithdrawalStatus(
  userId,
  status,
  amount,
  note = "",
  t = null
) {
  const st = String(status || "").toLowerCase();
  const a = Number(amount || 0);

  const base =
    st === "approved"
      ? `Your withdrawal of ₹${a} was approved.`
      : st === "rejected"
        ? `Your withdrawal of ₹${a} was rejected.`
        : `Your withdrawal of ₹${a} status updated: ${st || "updated"}.`;

  return notifyUser(
    userId,
    "withdrawal_update",
    `${base}${note ? ` Note: ${note}` : ""}`,
    t
  );
}

export async function notifyTournamentUpdate(userId, title, message, t = null) {
  const nm = title ? `${title}: ${message}` : message;
  return notifyUser(userId, "tournament_update", nm, t);
}