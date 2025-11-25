import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Environnement de test
    environment: 'jsdom',
    
    // Patterns d'inclusion
    include: ['services/__tests__/**/*.test.ts'],
    
    // Exclure les anciens tests
    exclude: [
      '**/node_modules/**',
      'services/tests/**', // Anciens tests
    ],
    
    // Setup global
    setupFiles: ['services/__tests__/setup.ts'],
    
    // Globals pour Vitest
    globals: true,
    
    // Couverture de code
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'services/config/**/*.ts',
        'services/core/**/*.ts',
        'services/api/**/*.ts',
        'services/domain/**/*.ts',
        'services/repositories/**/*.ts',
        'services/application/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/index.ts',
        '**/*.d.ts',
      ],
    },
    
    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Reporter
    reporters: ['verbose'],
    
    // Isolation entre les tests
    isolate: true,
    
    // Pool de threads
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});

