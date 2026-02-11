// frontend/src/context/AuthContext.js
import React, { createContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

export const AuthContext = createContext({
  user: null,
  token: null,
  setUser: () => {},
  setToken: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem("token") || null);

  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const setToken = (newToken) => {
    const next = newToken ? String(newToken) : null;
    setTokenState(next);

    if (next) localStorage.setItem("token", next);
    else localStorage.removeItem("token");
  };

  const logout = () => {
    setTokenState(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  // keep user in localStorage in sync
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  // refresh user from backend when token changes
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) return;

      try {
        const res = await axios.get("http://localhost:5000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.user) setUser(res.data.user);
      } catch (e) {
        const status = e?.response?.status;

        // If token invalid/expired -> logout
        if (status === 401) {
          logout();
          return;
        }

        // 404 means route missing/mis-mounted; do NOT logout user.
        console.error("auth/me failed", e);
      }
    };

    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      setUser,
      setToken,
      logout,
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}