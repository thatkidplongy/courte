import nextPlugin from '@next/eslint-plugin-next';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
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
      /**
       * ADR 0004: the web app holds no database connection. This is the rule that keeps the
       * split real — without it, one convenient import quietly recreates the second pool the
       * extraction existed to remove, and nothing would fail until production.
       */
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['pg', 'pg-*', 'drizzle-orm', 'drizzle-orm/*', 'postgres'],
              message: 'The web app talks to @courte/api over HTTP. Only the API holds a database pool.',
            },
          ],
        },
      ],
    },
  },
  prettier,
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
];
