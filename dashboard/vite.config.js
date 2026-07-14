import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/events': 'http://localhost:3001',
      '/mfa': 'http://localhost:3001',
      '/users': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
    },
  },
})
