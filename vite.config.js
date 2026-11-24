import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';

if (typeof process !== 'undefined' && process.cwd) {
  try {
    process.chdir(fs.realpathSync(process.cwd()));
  } catch {}
}

export default defineConfig(({ command }) => {
  const isVercel = Boolean(process.env.VERCEL) || process.env.DEPLOY_TARGET === 'vercel';
  const base = isVercel ? '/' : '/AbandonedButNotForgoten-Beta/';
  return {
    base,
    plugins: [react()],
    publicDir: 'public',
    resolve: {
      preserveSymlinks: true,
    },
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
      open: true,
      fs: {
        strict: false
      }
    }
  };
});
