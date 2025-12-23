// example: src/pages/admin/AdminHome.js
import { useNavigate } from "react-router-dom";

function AdminHome() {
  const navigate = useNavigate();

  return (
    <div className="admin-grid">
      {/* existing cards ... */}

      <div className="admin-card">
        <h3>Wallet Top‑ups</h3>
        <p>View all wallet top‑ups and export CSV for accounting.</p>
        <button onClick={() => navigate("/admin/wallet-topups")}>
          Open Wallet Top‑ups
        </button>
      </div>
    </div>
  );
}