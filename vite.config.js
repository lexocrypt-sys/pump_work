import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: [
      'adjacent-uses-paste-rack.trycloudflare.com',
      '.trycloudflare.com', // Allow all Cloudflare tunnel hosts
      'localhost',
      '127.0.0.1',
    ],
    host: true, // Allow external connections
  },
})
