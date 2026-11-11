import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://jacobjohnson-ai.github.io/service-desk-platform/
export default defineConfig({
  base: "/service-desk-platform/",
  plugins: [react()],
});
