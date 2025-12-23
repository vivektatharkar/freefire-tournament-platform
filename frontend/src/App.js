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

import AddBalance from "./pages/AddBalance";
import HelpCenter from "./pages/HelpCenter"; // ⬅️ new import

const adminEmails = ["vivektatharkar@gmail.com"];

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("parse user error", e);
    return null;
  }
}

function isAdminUser(user) {
  if (!user) return false;
  const role = (user.role || "").toString().toLowerCase();
  const email = (user.email || "").toString().toLowerCase();

  if (role === "admin") return true;
  if (adminEmails.includes(email)) return true;

  return false;
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem("token");
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdminUser(user)) {
    return <Navigate to="/home" replace />;
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

          {/* wallet: add balance */}
          <Route
            path="/add-balance"
            element={
              <ProtectedRoute>
                <AddBalance />
              </ProtectedRoute>
            }
          />

          {/* help center */}
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

          {/* admin tournaments */}
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

          {/* admin wallet top-ups */}
          <Route
            path="/admin/wallet-topups"
            element={
              <AdminRoute>
                <AdminWalletTopups />
              </AdminRoute>
            }
          />

          {/* admin withdrawals */}
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