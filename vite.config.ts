import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';

// GitHub Pages sert le site sous /<nom du dépôt>/ ; en dev on reste à la racine.
export default defineConfig(({ command, isPreview }) => {
  const base = command === 'build' || isPreview ? '/Sport-tracking/' : '/';
  return {
    base,
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    // Un seul bundle (~700 Ko, mis en cache par le service worker) : découper React et Recharts
    // dans des fichiers séparés crée une dépendance circulaire qui casse l'app en production.
    build: { chunkSizeWarningLimit: 800 },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Suivi Sport',
          short_name: 'Sport',
          description: 'Suivi streetlifting et jiu-jitsu brésilien',
          lang: 'fr',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#000000',
          theme_color: '#000000',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'] },
      }),
    ],
  };
});
