// frontend/src/App.js
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

import Home from "./pages/Home";
import Tournaments from "./pages/Tournaments";
import TournamentsB2B from "./pages/TournamentsB2B";
import TournamentsCS from "./pages/TournamentsCS";
import TournamentsHeadshot from "./pages/TournamentsHeadshot";

import TournamentHistory from "./pages/TournamentHistory";
import Profile from "./pages/Profile";
import Navbar from "./components/Navbar";

import AdminPanel from "./pages/AdminPanel";
import AdminWithdrawals from "./pages/AdminWithdrawals";

import AdminTournamentsHeadshot from "./pages/admin/AdminTournamentsHeadshot";
import AdminTournamentsBR from "./pages/admin/AdminTournamentsBR";
import AdminTournamentsB2B from "./pages/admin/AdminTournamentsB2B";
import AdminTournamentsCSAdmin from "./pages/admin/AdminTournamentsCS";
import AdminWalletTopups from "./pages/admin/AdminWalletTopups";

import AdminScores from "./pages/admin/AdminScores";
import AdminLeaderboard from "./pages/admin/AdminLeaderboard";
import AdminSupportInbox from "./pages/admin/AdminSupportInbox";

import AddBalance from "./pages/AddBalance";
import HelpCenter from "./pages/HelpCenter";

// ✅ NEW
import SuperAdmin from "./pages/SuperAdmin";

const adminEmails = ["vivektatharkar@gmail.com"];
const superAdminEmails = ["vivektatharkar@gmail.com"];

// ---------- helpers ----------
function safeLower(v) {
  return (v ?? "").toString().trim().toLowerCase();
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return parsed;
  } catch (e) {
    console.error("parse user error", e);
    return null;
  }
}

function getToken() {
  const token = localStorage.getItem("token");
  return token && token.toString().trim().length > 0 ? token : null;
}

function isAdminUser(user) {
  if (!user) return false;

  const role = safeLower(user.role);
  const email = safeLower(user.email);

  if (role === "admin") return true;
  if (adminEmails.map(safeLower).includes(email)) return true;

  return false;
}

function isSuperAdminUser(user) {
  if (!user) return false;
  const email = safeLower(user.email);
  return superAdminEmails.map(safeLower).includes(email);
}

// ---------- route guards ----------
function ProtectedRoute({ children }) {
  const token = getToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const token = getToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

function SuperAdminRoute({ children }) {
  const token = getToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdminUser(user)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function Layout({ children }) {
  const { pathname } = useLocation();
  const hideNavbar = pathname === "/login" || pathname === "/signup";

  return (
    <>
      {!hideNavbar && <Navbar />}
      {children}
    </>
  );
}

function StartPage() {
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<StartPage />} />

          {/* auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* user pages */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tournaments"
            element={
              <ProtectedRoute>
                <Tournaments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tournaments-b2b"
            element={
              <ProtectedRoute>
                <TournamentsB2B />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tournaments-cs"
            element={
              <ProtectedRoute>
                <TournamentsCS />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tournaments-headshot"
            element={
              <ProtectedRoute>
                <TournamentsHeadshot />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <TournamentHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/add-balance"
            element={
              <ProtectedRoute>
                <AddBalance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/help-center"
            element={
              <ProtectedRoute>
                <HelpCenter />
              </ProtectedRoute>
            }
          />

          {/* admin dashboard home */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />

          {/* ✅ SuperAdmin (only your email) */}
          <Route
            path="/superadmin"
            element={
              <SuperAdminRoute>
                <SuperAdmin />
              </SuperAdminRoute>
            }
          />

          <Route
            path="/admin/leaderboard"
            element={
              <AdminRoute>
                <AdminLeaderboard />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/support"
            element={
              <AdminRoute>
                <AdminSupportInbox />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/scores"
            element={
              <AdminRoute>
                <AdminScores />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/tournaments/headshot"
            element={
              <AdminRoute>
                <AdminTournamentsHeadshot />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/tournaments/br"
            element={
              <AdminRoute>
                <AdminTournamentsBR />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/tournaments/b2b"
            element={
              <AdminRoute>
                <AdminTournamentsB2B />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/tournaments/cs"
            element={
              <AdminRoute>
                <AdminTournamentsCSAdmin />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/wallet-topups"
            element={
              <AdminRoute>
                <AdminWalletTopups />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/withdrawals"
            element={
              <AdminRoute>
                <AdminWithdrawals />
              </AdminRoute>
            }
          />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}