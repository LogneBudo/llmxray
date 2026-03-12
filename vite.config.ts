import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { systemInfoPlugin } from './vite-plugin-system-info'
import { apiProbePlugin } from './vite-plugin-api-probe'

export default defineConfig({
  plugins: [vue(), tailwindcss(), systemInfoPlugin(), apiProbePlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:11434',
        changeOrigin: true,
      },
    },
  },
})
