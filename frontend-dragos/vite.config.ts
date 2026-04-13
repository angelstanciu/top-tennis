import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.png', 'robots.txt', 'sitemap.xml'],
            devOptions: {
                enabled: false
            },
            workbox: {
                skipWaiting: true,
                clientsClaim: true,
                cleanupOutdatedCaches: true,
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/api/, /^\/h2-console/, /^\/admin/],
                // Nu cache-uim chunk-urile JS cu strategie NetworkFirst
                // pentru a ne asigura că userul primește mereu ultima versiune
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
                        }
                    }
                ]
            },
            manifest: {
                name: 'Star Arena',
                short_name: 'Star Arena',
                description: 'Rezervări terenuri sport – Pitești, Bascov, Argeș',
                start_url: '/',
                display: 'standalone',
                background_color: '#0f172a',
                theme_color: '#0f172a',
                icons: [
                    {
                        src: '/favicon.png',
                        sizes: '1024x1024',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ],
    build: {
        // Target modern browsers — output mai mic, fără polyfills inutile
        target: 'es2020',
        rollupOptions: {
            output: {
                manualChunks: {
                    // React core — cel mai utilizat, se cache-uiește separat
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    // UI libraries
                    'vendor-ui': ['lucide-react', 'framer-motion', 'sonner', 'clsx', 'tailwind-merge'],
                    // Date/Calendar — folosit doar pe pagini specifice
                    'vendor-date': ['date-fns', 'react-day-picker'],
                    // Charts — folosit doar în admin
                    'vendor-charts': ['recharts'],
                    // Google OAuth — chunk separat, încărcat lazy
                    'vendor-google': ['@react-oauth/google'],
                    // Radix UI components
                    'vendor-radix': [
                        '@radix-ui/react-popover',
                        '@radix-ui/react-scroll-area',
                        '@radix-ui/react-select',
                        '@radix-ui/react-separator',
                        '@radix-ui/react-slot',
                    ],
                }
            }
        }
    },
    server: {
        host: '0.0.0.0',
        port: 5174,
        strictPort: true,
        allowedHosts: true,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path
            },
            '/login': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true,
                secure: false
            },
            '/logout': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true,
                secure: false
            }
        }
    },
    optimizeDeps: {
        force: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
})
