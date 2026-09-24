import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled via the DISABLE_HMR env var (used during automated Playwright test
      // runs, where a file-watch-triggered reload would otherwise reset React state mid-test).
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during automated test runs.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
