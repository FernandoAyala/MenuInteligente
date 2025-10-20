import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Permite acceso desde cualquier IP (0.0.0.0)
    open: true, // Abre automáticamente el navegador
    strictPort: true, // No cambiar puerto automáticamente si está ocupado
  },
  build: {
    outDir: 'dist-frontend', // Para no conflictuar con dist del backend
  },
})