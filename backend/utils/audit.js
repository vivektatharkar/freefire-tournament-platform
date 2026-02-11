// backend/utils/audit.js
import { AdminAuditLog } from "../models/index.js";

export async function auditLog(req, payload, t = null) {
  try {
    const ip =
      (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
      req.ip ||
      null;

    const userAgent = req.headers["user-agent"] || null;

    const row = {
      actor_user_id: req.user?.id,
      actor_email: req.user?.email || null,
      action: payload.action,
      target_user_id: payload.target_user_id ?? null,
      target_payment_id: payload.target_payment_id ?? null,
      amount: payload.amount ?? null,
      note: payload.note ?? null,
      ip,
      user_agent: userAgent,
    };

    return AdminAuditLog.create(row, t ? { transaction: t } : {});
  } catch (e) {
    // Never block the main action if logging fails
    console.warn("auditLog warning:", e?.message || e);
    return null;
  }
}