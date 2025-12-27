import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        host: true, // permite acces extern prin IP sau tunnel
        port: 5173,
        allowedHosts: true
    },
    optimizeDeps: {
        // Force re-optimization on dev start to avoid stale cache errors
        force: true,
    },
})
