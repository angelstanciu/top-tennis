import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg'],
            devOptions: {
                enabled: true
            },
            manifest: {
                name: 'Star Arena',
                short_name: 'Star Arena',
                description: 'Rezervari terenuri sport',
                start_url: '/',
                display: 'standalone',
                background_color: '#f0f9ff',
                theme_color: '#0ea5e9',
                icons: [
                    {
                        src: '/favicon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any'
                    }
                ]
            }
        })
    ],
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
