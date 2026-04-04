import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: resolve(__dirname, 'showcase'),
  base: '/ThekSelect/',
  build: {
    outDir: resolve(__dirname, 'dist-showcase'),
    emptyOutDir: true
  }
});
