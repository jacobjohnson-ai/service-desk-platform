import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://jacobjohnson-ai.github.io/northwind-service-desk/
export default defineConfig({
  base: "/northwind-service-desk/",
  plugins: [react()],
});
