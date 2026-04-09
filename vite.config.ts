import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: 'jsdom'
  },
  build: {
    minify: process.env.THEK_MINIFY === '1' ? 'terser' : false,
    cssMinify: process.env.THEK_MINIFY === '1' ? 'esbuild' : false,
    terserOptions:
      process.env.THEK_MINIFY === '1'
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
        return isMin ? 'thekselect.umd.min.js' : 'thekselect.umd.js';
      },
      formats: ['es', 'umd']
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'css/[name][extname]';
          }
          return '[name][extname]';
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
