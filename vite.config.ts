import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { manusRuntime } from "vite-plugin-manus-runtime";

// Use VITE_BASE_URL env var for GitHub Pages deployment (e.g. /solid-geometry-calculator/)
const base = process.env.VITE_BASE_URL ?? "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), manusRuntime()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          katex: ["katex"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
