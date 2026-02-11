// src/pages/admin/AdminDashboard.js
import React from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="admin-panel">
      <h1>Admin Panel</h1>
      <p>Welcome, admin! Manage tournaments, withdrawals and notifications here.</p>

      <div className="admin-card-grid">
        {/* existing cards ... */}

        {/* NEW: wallet top‑ups card */}
        <div className="admin-card">
          <h3>Wallet Top‑ups</h3>
          <p>View all wallet top‑ups and export CSV for reconciliation.</p>
          <button
            className="admin-card-btn"
            onClick={() => navigate("/admin/wallet-topups")}
          >
            Open Wallet Top‑ups
          </button>
        </div>
      </div>
    </div>
  );
}