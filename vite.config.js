// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Raise the warning threshold — pdf.worker alone is ~2 MB and is expected
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      external: [],
      output: {
        // Split heavy libraries into separate lazy-loaded chunks so the
        // initial page load stays fast.
        manualChunks: {
          "vendor-react":    ["react", "react-dom"],
          "vendor-jspdf":    ["jspdf"],
          "vendor-html2canvas": ["html2canvas"],
          "vendor-mammoth":  ["mammoth"],
          // pdfjs-dist is already split out via the pdf.worker.mjs asset;
          // the main pdfjs lib goes in its own chunk too.
          "vendor-pdfjs":    ["pdfjs-dist"],
        },
      },
    },
  },
});
