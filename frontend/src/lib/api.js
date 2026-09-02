// Thin fetch wrapper around the Zyverse backend.
//
// In dev, requests go to "/api/..." and Vite proxies them to the Express server
// (see vite.config.js). In production set VITE_API_BASE to the backend origin.

const API_BASE = import.meta.env.VITE_API_BASE || "";

const TOKEN_KEY = "zyverse_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — token just won't persist across reloads */
  }
}

/**
 * Resolves a server-relative upload path ("/uploads/x.png") to something the
 * browser can load. With a configured API base it needs the absolute origin.
 */
export function assetUrl(pathname) {
  if (!pathname) return "";
  if (/^https?:\/\//i.test(pathname)) return pathname;
  return `${API_BASE}${pathname}`;
}

async function request(path, { method = "GET", body, auth = true, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  const token = getToken();
  if (auth && token) finalHeaders.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers: finalHeaders,
      body: payload,
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // ── Auth ──────────────────────────────────────────────
  googleLogin: (credential) =>
    request("/auth/google", { method: "POST", body: { credential }, auth: false }),

  me: () => request("/auth/me"),

  // ── Onboarding ────────────────────────────────────────
  onboarding: (formData) =>
    request("/user/onboarding", { method: "POST", body: formData }),

  // ── Events ────────────────────────────────────────────
  listEvents: () => request("/events", { auth: false }),

  register: (formData) =>
    request("/events/register", { method: "POST", body: formData }),

  myRegistration: () => request("/events/my-registration"),
};
