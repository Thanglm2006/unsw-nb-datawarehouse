import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    plugins: [react()],
    server: {
      host: true,
      port: Number(env.FRONTEND_PORT || 5175),
      strictPort: true,
      proxy: {
        '/api': env.VITE_API_PROXY_TARGET || 'http://localhost:8009',
        '/health': env.VITE_API_PROXY_TARGET || 'http://localhost:8009',
      },
    },
  }
})
