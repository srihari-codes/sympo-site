// Global store allowing entire experience to update accodingly.

import { create } from "zustand";

export const useExperienceStore = create((set) => ({
  isExperienceReady: false,
  isExperienceLoading: true,
  loadedChunks: 0,
  totalChunks: 4,
  scrollProgress: 0,

  // Auto-navigation: a nav-bar click asks the camera to travel to a section's
  // scroll position, then the modal opens on arrival. { modalId, target, key }
  navRequest: null,

  // The 3D hero dragon has finished its entrance and dissolved into the "Z".
  dragonLanded: false,

  setIsExperienceReady: () => set({ isExperienceReady: true }),
  setIsExperienceLoading: (isLoading) =>
    set({ isExperienceLoading: isLoading }),
  incrementLoadedChunks: () =>
    set((state) => ({ loadedChunks: state.loadedChunks + 1 })),
  setScrollProgress: (scrollProgress) => set({ scrollProgress }),

  requestNav: (modalId, target) =>
    set({ navRequest: { modalId, target, key: Date.now() } }),
  clearNavRequest: () => set({ navRequest: null }),

  setDragonLanded: (v = true) => set({ dragonLanded: v }),
}));
