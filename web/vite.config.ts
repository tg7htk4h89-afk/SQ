import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'KIB Branch Service Quality',
        short_name: 'BSQ',
        description: 'Branch service quality inspections for the Service Quality Unit',
        theme_color: '#0E1A17',
        background_color: '#0E1A17',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Checklists and branch lists must be readable with no signal.
            urlPattern: /\/api\/(templates|branches)/,
            handler: 'NetworkFirst',
            options: { cacheName: 'bsq-reference', expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /drive\.google\.com/,
            handler: 'CacheFirst',
            options: { cacheName: 'bsq-photos', expiration: { maxEntries: 400 } },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: {
    proxy: { '/api': 'http://localhost:4000' },
  },
});
