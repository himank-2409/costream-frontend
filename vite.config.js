// Vite configuration for local React development and backend proxying.
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/ws': {
          target: env.VITE_WS_URL,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
