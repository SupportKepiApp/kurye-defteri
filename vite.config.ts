import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    assetsInclude: ["**/*.jpg"],
  },
  resolve: {
    alias: {
      xlsx: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs",
    },
  },
});
