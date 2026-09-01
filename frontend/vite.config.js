import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), glsl()],
  server: {
    proxy: {
      // Dev: forward API + uploads + admin console to the Express backend
      "/api": {
        target: process.env.VITE_API_TARGET || "http://localhost:5050",
        changeOrigin: true,
      },
      "/uploads": {
        target: process.env.VITE_API_TARGET || "http://localhost:5050",
        changeOrigin: true,
      },
      "/admin": {
        target: process.env.VITE_API_TARGET || "http://localhost:5050",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          drei: ["@react-three/drei", "@react-three/fiber"],
          vendor: ["react", "react-dom", "gsap", "zustand"],
        },
      },
    },
  },
});
