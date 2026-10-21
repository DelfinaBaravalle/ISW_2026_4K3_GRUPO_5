import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**'],
      exclude: ['src/server.ts'], // solo arranca el servidor
      reporter: ['text', 'html'],
    },
  },
});
