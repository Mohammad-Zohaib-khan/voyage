/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Same-origin API in development, so the session cookie stays first-party.
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false },
    },
  },
  preview: {
    port: 4173,
    proxy: { '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false } },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // Never inline fonts as data: URIs; the production CSP only allows fonts from 'self'.
    assetsInlineLimit: (filePath) => (/\.(woff2?|ttf|otf)$/.test(filePath) ? false : undefined),
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/[\\/](react|react-dom|scheduler|react-router)[\\/]/.test(id)) return 'react';
            if (id.includes('motion') || id.includes('framer-motion')) return 'motion';
            if (id.includes('@tanstack')) return 'query';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
