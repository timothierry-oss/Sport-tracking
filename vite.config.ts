import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';

// GitHub Pages sert le site sous /<nom du dépôt>/ ; en dev on reste à la racine.
export default defineConfig(({ command }) => {
  const base = command === 'build' ? '/Sport-tracking/' : '/';
  return {
    base,
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    build: { chunkSizeWarningLimit: 600, rollupOptions: { output: { manualChunks: { charts: ['recharts'], vendor: ['react', 'react-dom', 'dexie', 'dexie-react-hooks'] } } } },
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
