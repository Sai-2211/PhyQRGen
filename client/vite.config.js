import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Security fix: bind Vite dev server to localhost and remove unused Node polyfills that pull vulnerable crypto shims.
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173
  }
});
