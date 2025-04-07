import eslint from '@eslint/js';
import vitestPlugin from '@vitest/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import promisePlugin from 'eslint-plugin-promise';
import globals from 'globals';
import tsEsLint, { configs as tsConfigs, parser as tsParser, plugin as tsPlugin } from 'typescript-eslint';

export default tsEsLint.config(
  eslint.configs.recommended,
  ...tsConfigs.recommendedTypeChecked,
  importPlugin.flatConfigs.recommended,
  promisePlugin.configs['flat/recommended'],
  eslintConfigPrettier,
  {
    ignores: ['node_modules', 'cdk.out', 'dist', 'knex'],
  },
  {
    files: ['**/*.ts', '*.config.{js,ts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
      },
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.vitest,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          js: 'never',
          mjs: 'never',
          jsx: 'never',
          ts: 'never',
          tsx: 'never',
        },
      ],
      'import/no-unresolved': 'off',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['sibling', 'parent'], 'index', 'unknown'],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: false },
        },
      ],
      'prettier/prettier': 'warn',
      'sort-imports': [
        'error',
        {
          ignoreCase: false,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
          allowSeparatedGroups: false,
        },
      ],
    },
    settings: {
      'import/extensions': ['.js', '.mjs', '.jsx', '.ts', '.tsx'],
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
        node: true,
      },
    },
  },
  {
    files: ['**/*.js'],
    ...tsConfigs.disableTypeChecked,
  },
  {
    files: ['test/**'],
    languageOptions: {
      globals: {
        ...vitestPlugin.environments.env.globals,
      },
    },
    plugins: {
      vitest: vitestPlugin,
    },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
    settings: {
      vitest: {
        typecheck: true,
      },
    },
  },
);
