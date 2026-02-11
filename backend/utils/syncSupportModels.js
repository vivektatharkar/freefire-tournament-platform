// backend/utils/syncSupportModels.js
import SupportTicket from "../models/SupportTicket.js";
import SupportMessage from "../models/SupportMessage.js";

function isDeadlock(err) {
  const msg = (err?.original?.message || err?.message || "").toLowerCase();
  return msg.includes("deadlock found") || msg.includes("er_lock_deadlock");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Sync support tables in correct order (Ticket first, then Message).
 * Runs only in non-production by default.
 */
export async function syncSupportModels() {
  const env = process.env.NODE_ENV || "development";
  const shouldSync = env !== "production" && process.env.SYNC_SUPPORT !== "0";

  if (!shouldSync) return;

  const maxRetries = Number(process.env.SYNC_RETRIES || 4);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Order matters because messages depend on ticket_id
      await SupportTicket.sync({ alter: true });
      await SupportMessage.sync({ alter: true });
      return;
    } catch (err) {
      if (!isDeadlock(err) || attempt === maxRetries) {
        console.error("Support sync failed:", err?.message || err);
        return;
      }

      const backoff = 400 * attempt; // small backoff
      console.warn(`Support sync deadlock, retrying in ${backoff}ms...`);
      await sleep(backoff);
    }
  }
}