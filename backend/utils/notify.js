// backend/utils/notify.js
import { Notification } from "../models/index.js";

export async function notifyUser(userId, type, message, t = null) {
  return Notification.create(
    {
      user_id: userId,
      type,
      message,
      read_flag: false,
    },
    t ? { transaction: t } : {}
  );
}