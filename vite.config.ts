import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const isAdmin = mode === "admin";

  return {
    plugins: [react()],
    server: {
      port: isAdmin ? 5174 : 5173,
      host: true,
      open: false,
      strictPort: true,
    },
    build: {
      outDir: isAdmin ? "dist-admin" : "dist-client",
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    define: {
      __APP_MODE__: JSON.stringify(mode),
    },
  };
});