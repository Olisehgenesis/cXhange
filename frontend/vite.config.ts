import dotenv from 'dotenv';
dotenv.config();
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.VITE_API_PORT || 3001}`,
        changeOrigin: true,
      },
    },
    allowedHosts: true,
  },
}) 