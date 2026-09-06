import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'BrokeEven',
        short_name: 'BrokeEven',
        // Literals: the manifest cannot read a CSS custom property. Keep in
        // sync with --color-bg in src/styles.css. An already-installed PWA
        // keeps the old colour until it is reinstalled.
        theme_color: '#F0F2F0',
        background_color: '#F0F2F0',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts'
  }
});
