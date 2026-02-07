import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
  build: {
    minify: process.env.THEK_MINIFY === '1' ? 'terser' : false,
    cssMinify: process.env.THEK_MINIFY === '1' ? 'esbuild' : false,
    terserOptions: process.env.THEK_MINIFY === '1'
      ? {
          compress: { passes: 2 },
          format: { comments: false }
        }
      : undefined,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ThekSelect',
      fileName: (format) => {
        const isMin = process.env.THEK_MINIFY === '1';
        if (format === 'es') {
          return isMin ? 'thekselect.min.js' : 'thekselect.js';
        }
        return isMin ? 'thekselect.umd.min.cjs' : 'thekselect.umd.cjs';
      },
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'css/[name][extname]';
          }
          return '[name][extname]';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
