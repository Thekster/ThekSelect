import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['packages/*/tests/**/*.test.ts']
  }
});
