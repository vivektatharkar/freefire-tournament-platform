// frontend/src/components/NotificationBell.jsx
import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [unread, setUnread] = useState(0);

  const token = localStorage.getItem("token");

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const load = useCallback(async () => {
    if (!token) {
      setList([]);
      setUnread(0);
      return;
    }
    try {
      const res = await axios.get("http://localhost:5000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const items = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.notifications)
        ? res.data.notifications
        : [];

      setList(items);
      setUnread(items.filter((n) => !n.read_flag).length);
    } catch (err) {
      console.error("notification load error", err);
      setList([]);
      setUnread(0);
    }
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000); // poll every 15s
    return () => clearInterval(id);
  }, [load]);

  const markAllRead = async () => {
    if (!token) return;
    try {
      await axios.post(
        "http://localhost:5000/api/notifications/mark-all-read",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      load();
    } catch (err) {
      console.error("mark read error", err);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "relative",
          background: "transparent",
          border: "none",
          fontSize: 20,
          cursor: "pointer",
          color: "#e5e7eb",
        }}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "#ef4444",
              color: "#fff",
              fontSize: 10,
              borderRadius: 999,
              padding: "2px 6px",
            }}
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 36,
            width: 300,
            maxHeight: 360,
            overflowY: "auto",
            background: "#020617",
            border: "1px solid #1f2937",
            borderRadius: 12,
            padding: 10,
            zIndex: 100,
            boxShadow: "0 12px 30px rgba(0,0,0,0.8)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <strong style={{ fontSize: 13 }}>Notifications</strong>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  fontSize: 11,
                  background: "none",
                  border: "none",
                  color: "#60a5fa",
                  cursor: "pointer",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {list.length === 0 && (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              No notifications
            </div>
          )}

          {list.map((n) => (
            <div
              key={n.id}
              style={{
                padding: "8px 10px",
                marginBottom: 6,
                borderRadius: 8,
                background: n.read_flag
                  ? "#020617"
                  : "rgba(59,130,246,0.12)",
                border: "1px solid #1f2937",
                fontSize: 12,
              }}
            >
              <div style={{ color: "#e5e7eb" }}>{n.message}</div>
              <div
                style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}
              >
                {formatDate(n.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}