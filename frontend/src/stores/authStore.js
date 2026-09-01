// Auth + registration state for the Dashboard flow.
//
// One store holds everything the dashboard needs: the logged-in user, their
// single event registration and their team. `refresh()` pulls all three from
// GET /api/auth/me in one shot.

import { create } from "zustand";
import { api, getToken, setToken } from "../lib/api";

export const useAuthStore = create((set, get) => ({
  // "idle" -> "loading" -> "ready"; "error" only for a failed silent restore
  status: "idle",
  user: null,
  registration: null,
  team: null,
  error: null,

  isLoggedIn: () => Boolean(get().user),

  /** Silent session restore on app boot (no-op when there's no stored token). */
  init: async () => {
    if (!getToken()) {
      set({ status: "ready" });
      return;
    }
    set({ status: "loading" });
    try {
      const data = await api.me();
      set({
        status: "ready",
        user: data.user,
        registration: data.registration || null,
        team: data.team || null,
      });
    } catch {
      // Expired/invalid token — drop it and start clean.
      setToken(null);
      set({ status: "ready", user: null, registration: null, team: null, error: null });
    }
  },

  /** Exchange a Google ID token for a session, then load the full profile. */
  loginWithGoogle: async (credential) => {
    set({ status: "loading", error: null });
    try {
      const res = await api.googleLogin(credential);
      setToken(res.token);
      set({ user: res.user });
      await get().refresh();
      return res.user;
    } catch (err) {
      set({ status: "ready", error: err.message });
      throw err;
    }
  },

  /** Re-pull user + registration + team. */
  refresh: async () => {
    const data = await api.me();
    set({
      status: "ready",
      user: data.user,
      registration: data.registration || null,
      team: data.team || null,
    });
    return data;
  },

  setUser: (user) => set({ user }),
  setRegistration: (registration) => set({ registration }),
  setTeam: (team) => set({ team }),

  logout: () => {
    setToken(null);
    set({ user: null, registration: null, team: null, error: null });
  },
}));
