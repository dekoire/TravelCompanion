import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    environment: 'node',
    coverage: { provider: 'v8', include: ['packages/*/src/**/*.ts'], exclude: ['**/*.test.ts'] },
  },
  resolve: {
    alias: {
      '@abg/schemas': new URL('./packages/schemas/src/index.ts', import.meta.url).pathname,
      '@abg/domain': new URL('./packages/domain/src/index.ts', import.meta.url).pathname,
      '@abg/llm': new URL('./packages/llm/src/index.ts', import.meta.url).pathname,
    },
  },
});
