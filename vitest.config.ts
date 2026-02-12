import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./preload-env.ts', './tests/setup.ts'], 
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
})
