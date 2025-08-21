// src/context/AuthContext.jsx
import { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";
import { authApi, setAuthToken, setRefreshToken } from "../services/api";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

function toRolesArray(rolesClaim) {
  if (!rolesClaim) return [];
  if (Array.isArray(rolesClaim)) return rolesClaim.map(r => String(r).trim());
  return String(rolesClaim).split(",").map(r => r.trim()).filter(Boolean);
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken]   = useState(() => localStorage.getItem("access_token") || null);
  const [refreshToken, setRToken]       = useState(() => localStorage.getItem("refresh_token") || null);
  const [user, setUser]                 = useState(() => {
    const raw = localStorage.getItem("auth_user");
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  });

  // Timer para refresh proactivo
  const refreshTimerRef = useRef(null);
  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) { clearTimeout(refreshTimerRef.current); refreshTimerRef.current = null; }
  };

  const scheduleProactiveRefresh = (token) => {
    clearRefreshTimer();
    if (!token) return;
    try {
      const { exp } = jwtDecode(token); // seg UNIX
      const now = Math.floor(Date.now()/1000);
      const skew = 60; // segundos antes del exp
      const delayMs = Math.max((exp - now - skew) * 1000, 0);
      refreshTimerRef.current = setTimeout(() => doRefresh(), delayMs);
    } catch { /* token inválido, no programar */ }
  };

  const doRefresh = async () => {
    try {
      const { data } = await authApi.post("/auth/refresh", { refreshToken });
      if (data?.accessToken) {
        localStorage.setItem("access_token", data.accessToken);
        setAccessToken(data.accessToken);
        setAuthToken(data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem("refresh_token", data.refreshToken);
          setRToken(data.refreshToken);
          setRefreshToken(data.refreshToken);
        }
        // mantiene user (id/email/roles) consistente si cambian claims
        try {
          const claims = jwtDecode(data.accessToken);
          const roles = toRolesArray(claims.roles);
          const u = { id: claims.sub, email: claims.email, roles };
          setUser(u);
          localStorage.setItem("auth_user", JSON.stringify(u));
        } catch {}
        scheduleProactiveRefresh(data.accessToken);
      }
    } catch (e) {
      // refresh falló → cerrar sesión
      logout();
    }
  };

  useEffect(() => {
    setAuthToken(accessToken || null);
    setRefreshToken(refreshToken || null);
    scheduleProactiveRefresh(accessToken);
    return () => clearRefreshTimer();
  }, [accessToken, refreshToken]);

  const login = async ({ email, password }) => {
    const { data } = await authApi.post("/auth/login", { email, password });
    const claims = jwtDecode(data.accessToken);
    const roles = toRolesArray(claims.roles);
    const u = { id: claims.sub, email: claims.email, roles };

    setAccessToken(data.accessToken);
    setRToken(data.refreshToken);
    setUser(u);

    localStorage.setItem("access_token", data.accessToken);
    localStorage.setItem("refresh_token", data.refreshToken);
    localStorage.setItem("auth_user", JSON.stringify(u));

    setAuthToken(data.accessToken);
    setRefreshToken(data.refreshToken);

    scheduleProactiveRefresh(data.accessToken);
  };

  const logout = () => {
    clearRefreshTimer();
    setAccessToken(null);
    setRToken(null);
    setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_user");
    setAuthToken(null);
    setRefreshToken(null);
  };

  const value = useMemo(() => ({ user, login, logout, accessToken, refreshToken }), [user, accessToken, refreshToken]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() debe usarse dentro de <AuthProvider>.");
  return ctx;
}

// Al final del archivo, después del export de useAuth()
if (import.meta.env.DEV) {
  // Llama en consola: window.__whoami()
  window.__whoami = () => {
    try {
      const at = localStorage.getItem("access_token");
      const rt = localStorage.getItem("refresh_token");
      const { jwtDecode } = require("jwt-decode");
      const claims = at ? jwtDecode(at) : null;
      console.table({
        access_present: !!at,
        refresh_present: !!rt,
        sub: claims?.sub,
        email: claims?.email,
        roles: Array.isArray(claims?.roles) ? claims.roles.join(",") : (claims?.roles || "(none)"),
        exp_unix: claims?.exp,
      });
      return claims;
    } catch (e) {
      console.warn("No se pudo decodificar access_token", e);
      return null;
    }
  };
}

