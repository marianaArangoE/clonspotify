import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    cors: true,
    allowedHosts: [
      'miapp.loca.lt',
      'clonspotify.onrender.com '
    ],
    hmr: {
      protocol: 'wss',
      host: 'miapp.loca.lt',
      clientPort: 443
    },
  },
});
