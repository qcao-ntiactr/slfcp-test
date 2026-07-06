import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:3000',
        // Bypass proxy for client-side auth callback route
        bypass(req) {
          if (
            req.url === '/auth/callback' ||
            req.url.startsWith('/auth/callback?')
          ) {
            return '/auth/callback';
          }
        },
      },
    },
  },
});
