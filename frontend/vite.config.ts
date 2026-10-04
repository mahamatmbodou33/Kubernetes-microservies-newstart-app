import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API base URL is configured via VITE_API_BASE_URL (see .env.example).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // listen on all interfaces (needed inside containers)
  },
  preview: {
    port: 5173,
    host: true,
  },
});
