// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // ✅ Tells Vite to use relative paths (important for Vercel)
  build: {
    outDir: "dist",
  },
});
