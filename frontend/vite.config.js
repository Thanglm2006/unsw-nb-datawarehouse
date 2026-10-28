import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const allowedHosts = (env.VITE_ALLOWED_HOSTS || 'dw.caelestial.store')
    .split(',')
    .map(host => host.trim())
    .filter(Boolean)
  return {
    plugins: [react()],
    server: {
      host: true,
      port: Number(env.FRONTEND_PORT || 5175),
      strictPort: true,
      allowedHosts,
      proxy: {
        '/api': env.VITE_API_PROXY_TARGET || 'http://localhost:8009',
        '/health': env.VITE_API_PROXY_TARGET || 'http://localhost:8009',
      },
    },
  }
})
