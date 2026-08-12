import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  {
    files: ['**/*.ts'],
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
    // ADR 0004: the domain core stays framework-free so it is unit-testable without a server.
    // Nothing under src/domain may reach for Nest, the database client or a driver —
    // repositories are injected by the caller.
    //
    // @courte/contract is deliberately NOT restricted: it is types and Zod schemas with no
    // runtime, and letting the domain share one definition of the enums that cross the wire
    // beats maintaining a second copy that silently drifts.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs', '@nestjs/*'],
              message: 'The domain core must not depend on Nest. See docs/adr/0004.',
            },
            {
              group: ['@/db', '@/db/*'],
              message: 'Domain code receives repositories as arguments; it never imports them.',
            },
            {
              group: ['pg', 'drizzle-orm', 'drizzle-orm/*'],
              message: 'Database drivers belong in src/db, not the domain.',
            },
            {
              group: ['express', 'express/*'],
              message: 'The domain core must not know about HTTP. See docs/adr/0004.',
            },
          ],
        },
      ],
    },
  },
  {
    // Repositories build and run queries. Reaching for a domain workflow or a Nest decorator
    // from here inverts the dependency the whole layering exists to keep pointing one way.
    files: ['src/db/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['@nestjs', '@nestjs/*'], message: 'Repositories are plain functions, not providers.' }],
        },
      ],
    },
  },
  prettier,
  { ignores: ['dist/**', 'node_modules/**'] },
];
