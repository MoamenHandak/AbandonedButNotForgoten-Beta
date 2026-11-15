import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
  const isVercel = Boolean(process.env.VERCEL) || process.env.DEPLOY_TARGET === 'vercel';
  const base = isVercel ? '/' : (command === 'build' ? '/AbandonedButNotForgoten-Beta/' : '/');
  return {
    base,
    plugins: [react()],
    publicDir: 'public',
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) return 'three-vendor';
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react-vendor';
            if (id.includes('node_modules/lucide-react')) return 'icons-vendor';
          }
        }
      }
    },
    server: {
      port: 3000,
      open: true
    }
  };
});
