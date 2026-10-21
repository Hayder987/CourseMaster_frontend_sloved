import axios from "axios";
import { getToken, clearToken } from "../utils/auth";

const env = import.meta.env || {};

const baseURL =
  env.VITE_API_BASE_URL ||
  // Only a local dev server may fall back to the local backend. A production
  // build must never silently point at the developer's localhost.
  (env.DEV ? "http://localhost:5000/api" : "");

if (env.PROD && !env.VITE_API_BASE_URL) {
  console.error(
    "VITE_API_BASE_URL is not configured; API requests will be sent to the frontend origin."
  );
}

const api = axios.create({ baseURL });

// Request interceptor - automatically add token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest = /\/auth\/(login|register)$/.test(
      error.config?.url || ""
    );

    // A rejected login/register is a credential error, not an expired
    // session: keep the form mounted so its own error message renders.
    if (error.response?.status === 401 && !isAuthRequest) {
      // Token expired or invalid
      clearToken();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
