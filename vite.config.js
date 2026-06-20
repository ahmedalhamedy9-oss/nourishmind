import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    // Increase warning limit slightly (Firebase is large)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split vendor code into separate cacheable chunks
        manualChunks: {
          // React core — cached separately, rarely changes
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Firebase — large, split into sub-chunks
          'firebase-core': ['firebase/app', 'firebase/auth'],
          'firebase-firestore': ['firebase/firestore'],
          // UI utilities
          'ui-vendor': ['framer-motion', 'lucide-react'],
        },
      },
    },
  },
});
