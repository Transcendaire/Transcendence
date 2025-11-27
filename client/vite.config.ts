import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: '.',
  publicDir: 'public',
  
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared/src')
    }
  },

  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true
    },
    proxy: {
      '/api': {
        target: 'http://server:8080',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://server:8080',
        ws: true,
        changeOrigin: true
      }
    },
    hmr: {
      port: 5173
    }
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
})
