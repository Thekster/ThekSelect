import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      thekselect: resolve(__dirname, 'packages/thekselect/src/index.ts')
    }
  },
  test: {
    environment: 'jsdom',
    include: ['packages/*/tests/**/*.test.ts']
  }
});
