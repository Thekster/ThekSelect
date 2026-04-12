import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ThekSelectVue',
      fileName: (format) => (format === 'cjs' ? 'thekselect-vue.cjs' : 'thekselect-vue.js'),
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['vue', 'thekselect'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          thekselect: 'ThekSelect'
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
