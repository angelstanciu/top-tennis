import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.png'],
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
                        src: '/favicon.png',
                        sizes: '1024x1024',
                        type: 'image/png',
                        purpose: 'any'
                    }
                ]
            }
        })
    ],
    server: {
        host: '0.0.0.0', // permite acces extern prin IP sau tunnel
        port: 5174,
        strictPort: true,
        allowedHosts: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path
            }
        }
    },
    optimizeDeps: {
        // Force re-optimization on dev start to avoid stale cache errors
        force: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
})
