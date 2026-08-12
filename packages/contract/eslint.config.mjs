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
      /**
       * The contract is imported by a Nest service, a Next app and eventually a native client.
       * It must stay pure schema and types — anything with a runtime beyond Zod would drag a
       * dependency into all three at once.
       */
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs', '@nestjs/*', 'next', 'next/*', 'react', 'react-dom', 'pg', 'express'],
              message: 'The contract package is shared by every client. Keep it to types and Zod schemas.',
            },
          ],
        },
      ],
    },
  },
  prettier,
  { ignores: ['dist/**', 'node_modules/**'] },
];
