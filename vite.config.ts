import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'fonts/*.woff2'],
      manifest: {
        name: 'book·ish',
        short_name: 'book·ish',
        description: 'A personal reading log',
        scope: '/',
        id: '/',
        display: 'standalone',
        background_color: '#F5F0E6',
        theme_color: '#F5F0E6',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  test: { environment: 'node' },
} as Parameters<typeof defineConfig>[0]);
