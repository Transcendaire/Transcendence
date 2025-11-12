import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    typecheck: {
      tsconfig: './tsconfig.test.json' // ✅ Use test config
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.ts', '.tsx', '.js']
  }
});