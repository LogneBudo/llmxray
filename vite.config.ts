import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { systemInfoPlugin } from './vite-plugin-system-info.ts'
import { apiProbePlugin } from './vite-plugin-api-probe.ts'
import { observePlugin } from './vite-plugin-observe.ts'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VueI18nPlugin({
      include: resolve(dirname(fileURLToPath(import.meta.url)), 'src/locales/**'),
    }),
    systemInfoPlugin(),
    apiProbePlugin(),
    observePlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // One file per library family, so no page ships one 1 MB file and the browser keeps
        // each family cached across releases that only change the app.
        codeSplitting: {
          groups: [
            { name: 'vue', test: /node_modules[\\/](vue|@vue[\\/](runtime-core|runtime-dom|reactivity|shared|devtools-api)|vue-router|pinia)[\\/]/ },
            { name: 'i18n', test: /node_modules[\\/](vue-i18n|@intlify)[\\/]/ },
            { name: 'charts', test: /node_modules[\\/](chart\.js|vue-chartjs|@kurkle)[\\/]/ },
            { name: 'editor-core', test: /node_modules[\\/](@codemirror[\\/](view|state)|crelt|style-mod|w3c-keyname)[\\/]/ },
            { name: 'editor', test: /node_modules[\\/](@codemirror|@lezer|codemirror|vue-codemirror)[\\/]/ },
            { name: 'flow', test: /node_modules[\\/](@vue-flow|d3-)/ },
            { name: 'babel', test: /node_modules[\\/]@babel[\\/]/ },
            { name: 'recast', test: /node_modules[\\/](recast|ast-types|esprima|source-map|tslib)[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:11434',
        changeOrigin: true,
      },
      '/v1': {
        target: 'http://localhost:11434',
        changeOrigin: true,
      },
    },
  },
})
