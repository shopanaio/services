import { defineConfig, globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import graphqlPlugin from '@graphql-eslint/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default defineConfig([
  globalIgnores([
    'node_modules/**',
    'dist/**',
    'coverage/**',
    '.next/**',
    '.vscode/**',
    'build/**',
    'codegen/**',
    'queries/filenames.ts',
    'bin/**',
    "k6/**",
  ]),

  tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.strict,
    tseslint.configs.stylistic,
    eslintConfigPrettier,
    {
      rules: {
        '@typescript-eslint/prefer-for-of': 'off',
        '@typescript-eslint/consistent-type-definitions': 'off',
      },
    },
    {
      files: ['**/*.gql'],
      languageOptions: { parser: graphqlPlugin.parser },
      plugins: { '@graphql-eslint': graphqlPlugin },
      rules: {
        '@graphql-eslint/match-document-filename': [
          'error',
          {
            fileExtension: '.gql',
            mutation: 'PascalCase',
            query: 'PascalCase',
          },
        ],
      },
    },
  ),
]);
