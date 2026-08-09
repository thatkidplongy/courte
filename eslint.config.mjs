import nextPlugin from '@next/eslint-plugin-next';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  // Next 16's plugin is flat-native; its core-web-vitals config replaces the old
  // FlatCompat + eslint-config-next dance, which no longer resolves.
  nextPlugin.configs['core-web-vitals'],
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { parser: tsParser },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    // ADR 0003: the domain core stays framework-free so it is unit-testable without a server.
    // Nothing under src/domain may reach for Next, React, or the database client directly —
    // repositories are injected by the caller.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['next', 'next/*'], message: 'The domain core must not depend on Next. See docs/adr/0003.' },
            { group: ['react', 'react-dom'], message: 'The domain core must not depend on React. See docs/adr/0003.' },
            { group: ['@/db', '@/db/*'], message: 'Domain code receives repositories as arguments; it never imports them.' },
            { group: ['pg', 'drizzle-orm', 'drizzle-orm/*'], message: 'Database drivers belong in src/db, not the domain.' },
          ],
        },
      ],
    },
  },
  prettier,
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
];
