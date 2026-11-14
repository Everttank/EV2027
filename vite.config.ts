import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' zodat de app overal werkt (GitHub Pages submap, Vercel, lokaal).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Getij',
        short_name: 'Getij',
        description: 'Gezondheid, geld en hoofd — alles lokaal op je telefoon.',
        lang: 'nl',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#0a1013',
        theme_color: '#0a1013',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Lang indrukken op het app-icoon (Android) → direct naar invullen
        shortcuts: [
          { name: 'Stappen invullen', short_name: 'Stappen', url: './#/gezondheid/stappen' },
          { name: 'Eten loggen', short_name: 'Eten', url: './#/gezondheid/eten' },
          { name: 'Check-in', short_name: 'Check-in', url: './#/mentaal' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
} as any);
