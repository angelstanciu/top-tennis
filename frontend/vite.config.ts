import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  optimizeDeps: {
    // Force re-optimization on dev start to avoid stale cache errors
    force: true,
  },
})
