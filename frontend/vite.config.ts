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
        target: `${process.env.VITE_API_URL || 'http://localhost:3001'}`,
        changeOrigin: true,
      },
    },
    allowedHosts: true,
  },
}) 