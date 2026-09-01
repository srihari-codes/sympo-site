// Background music state, shared between AudioManager and the overlay toggle.

import { create } from "zustand";

const STORAGE_KEY = "zyverse:muted";

// localStorage throws outright in some privacy modes, so never let it break boot.
const readStoredMute = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export const useAudioStore = create((set, get) => ({
  isMuted: readStoredMute(),
  // Set when the browser refuses playback and we need a fresh user gesture.
  needsGesture: false,
  // Set when the track fails to load, so the overlay can hide the toggle.
  isTrackMissing: false,

  toggleMute: () => {
    const isMuted = !get().isMuted;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(isMuted));
    } catch {
      // Preference just will not survive a reload; playback still works.
    }
    set({ isMuted });
  },

  setNeedsGesture: (needsGesture) => set({ needsGesture }),
  setIsTrackMissing: (isTrackMissing) => set({ isTrackMissing }),
}));
