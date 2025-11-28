import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  // Configuración para diferentes builds
  const isCliente = mode === "cliente";
  const isCocina = mode === "cocina";
  const isAdmin = mode === "admin";

  // Determinar qué archivo HTML usar según el modo
  let inputFile = "index.html";
  if (isCliente) {
    inputFile = "cliente.html";
  } else if (isCocina) {
    inputFile = "cocina.html";
  }

  return {
    plugins: [react()],
    server: {
      port: isAdmin ? 5174 : isCocina ? 5175 : 5173,
      host: true,
      open: false,
      strictPort: true,
    },
    build: {
      outDir: isAdmin ? "dist-admin" : isCocina ? "dist-cocina" : isCliente ? "dist-cliente" : "dist",
      rollupOptions: {
        input: path.resolve(__dirname, inputFile),
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    define: {
      __APP_MODE__: JSON.stringify(mode || "default"),
    },
  };
});