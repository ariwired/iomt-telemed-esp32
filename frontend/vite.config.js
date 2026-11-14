import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    rollupOptions: {
      output: {
        // Recharts + d3 mudam pouco; em chunk separado ficam em cache entre deploys.
        manualChunks(id) {
          if (/node_modules[\\/](recharts|d3-|victory-vendor|@reduxjs|immer|reselect|es-toolkit)/.test(id)) {
            return 'charts';
          }
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
