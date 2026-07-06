import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    //testTimeout: 1000000, // Set a global timeout for tests
    // Use default reporter
    reporters: ['default'],
    // Include specific test files
    include: [
      '**/*.test.js',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.integration.js',
      '**/*.integration.ts',
      '**/*.system.js',
      '**/*.system.ts',
    ],
    // Exclude specific directories or files from testing
    exclude: [
      '**/docs/**',
      '**/tsconfig/**',
      '**/node_modules/**',
      '**/dist/**',
    ],
    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        '**/docs/**',
        '**/tsconfig/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.js',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.integration.js',
        '**/*.integration.ts',
        '**/*.system.js',
        '**/*.system.ts',
      ],
    },
  },
});
