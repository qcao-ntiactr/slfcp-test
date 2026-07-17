import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const viewerPort = Number(process.env.WCAG_VIEWER_PORT ?? 7357);

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: 'localhost',
    port: viewerPort,
    strictPort: true,
  },
});
