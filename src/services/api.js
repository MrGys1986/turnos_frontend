// src/services/api.js
import axios from "axios";

const AUTH_BASE    = import.meta.env.VITE_AUTH_API_BASE    ?? "http://localhost:8081";
const CATALOG_BASE = import.meta.env.VITE_CATALOG_API_BASE ?? "http://localhost:8082";
const TURNOS_BASE  = import.meta.env.VITE_TURNOS_API_BASE  ?? "http://localhost:8083";

export const authApi    = axios.create({ baseURL: AUTH_BASE,    timeout: 15000 });
export const catalogApi = axios.create({ baseURL: CATALOG_BASE, timeout: 15000 });
export const turnosApi  = axios.create({ baseURL: TURNOS_BASE,  timeout: 15000 });

// Instancia “naked” (sin interceptores) para /auth/refresh
const nakedAuthApi = axios.create({ baseURL: AUTH_BASE, timeout: 15000 });

// ===== Helpers tokens =====
export const setAuthToken    = (t) => t ? localStorage.setItem("access_token",  t) : localStorage.removeItem("access_token");
export const setRefreshToken = (t) => t ? localStorage.setItem("refresh_token", t) : localStorage.removeItem("refresh_token");

// ===== Interceptor REQUEST: adjunta Bearer =====
const attachToken = (config) => {
  const t = localStorage.getItem("access_token");
  if (t) config.headers = { ...config.headers, Authorization: `Bearer ${t}` };

  // Diagnóstico útil en dev
  if (import.meta.env.DEV) {
    const full = `${config.baseURL || ""}${config.url || ""}`;
    // eslint-disable-next-line no-console
    console.debug("→", (config.method || "get").toUpperCase(), full, "| Auth?", !!config.headers?.Authorization);
  }
  return config;
};

authApi.interceptors.request.use(attachToken);
catalogApi.interceptors.request.use(attachToken);
turnosApi.interceptors.request.use(attachToken);

// ===== Interceptor RESPONSE: refresh on 401 =====
let refreshPromise = null;

const doRefresh = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const rt = localStorage.getItem("refresh_token");
      if (!rt) throw new Error("No refresh token");
      // IMPORTANTE: usar instancia SIN interceptores para evitar enviar Authorization caducado
      const { data } = await nakedAuthApi.post("/auth/refresh", { refreshToken: rt });
      const newAccess  = data?.accessToken || data?.access || data?.token;
      const newRefresh = data?.refreshToken || null;
      if (!newAccess) throw new Error("Refresh no devolvió accessToken");

      setAuthToken(newAccess);
      if (newRefresh) setRefreshToken(newRefresh);
      return newAccess;
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

const shouldBypass = (cfg) => {
  const url = (cfg?.url || "").toString();
  return url.includes("/auth/login") || url.includes("/auth/refresh");
};

const refreshInterceptor = async (error) => {
  const { response, config } = error || {};
  const status = response?.status;

  if (status !== 401 || config?._retry || shouldBypass(config)) {
    return Promise.reject(error);
  }

  try {
    const newToken = await doRefresh();
    const retryCfg = {
      ...config,
      _retry: true,
      headers: { ...(config.headers || {}), Authorization: `Bearer ${newToken}` },
    };
    // Reintento respetando baseURL original
    return axios.request(retryCfg);
  } catch (e) {
    // Si el refresh falla, limpia sesión para que la UI redirija a login
    setAuthToken(null);
    setRefreshToken(null);
    return Promise.reject(error);
  }
};

authApi.interceptors.response.use(r => r, refreshInterceptor);
catalogApi.interceptors.response.use(r => r, refreshInterceptor);
turnosApi.interceptors.response.use(r => r, refreshInterceptor);
