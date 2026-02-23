import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vitest.config';

export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: ['tests/e2e/**/*.test.ts', 'tests/contracts/**/*.test.ts'],
      setupFiles: ['./preload-env.ts', './tests/setup.ts'],
      fileParallelism: false,
      maxWorkers: 1,
    },
  }),
);
