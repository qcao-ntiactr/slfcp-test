import js from '@eslint/js'; // ESLint's built-in JavaScript rules
import tseslint from '@typescript-eslint/eslint-plugin'; // TypeScript plugin
import tsParser from '@typescript-eslint/parser'; // TypeScript parser
import react from 'eslint-plugin-react'; // React plugin
import importPlugin from 'eslint-plugin-import'; // Import order checks
import jsxA11y from 'eslint-plugin-jsx-a11y'; // Accessibility plugin
import globals from 'globals';

export default [
  // Base ESLint configuration for JavaScript
  js.configs.recommended,

  // TypeScript configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: [
          './tsconfig.base.json',
          './apps/backend/tsconfig.json',
          './apps/frontend/.storybook/tsconfig.json',
        ], // Path to your TypeScript config
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ], // Warn on unused variables, ignore underscore-prefixed
      'no-unused-vars': [
        'warn',
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // React configuration
  {
    files: ['**/*.jsx', '**/*.tsx'],
    plugins: { react },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/jsx-uses-react': 'off', // No need for React import in React 17+
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off', // Disable PropTypes rule if using TypeScript
    },
  },

  // Accessibility (508 compliance) configuration
  {
    files: ['apps/frontend/**/*.{js,jsx,ts,tsx}'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      // Set critical accessibility rules to "error"
      'jsx-a11y/alt-text': 'error', // Enforce alt attributes on <img> tags
      'jsx-a11y/label-has-associated-control': 'error', // Enforce labels on form elements
      'jsx-a11y/no-static-element-interactions': 'error', // Prevent interactions on static elements
      'jsx-a11y/tabindex-no-positive': 'error', // Prevent positive tabindex values
      // Customize rules if needed, for example:
      'jsx-a11y/anchor-is-valid': [
        'warn',
        {
          aspects: ['noHref', 'invalidHref', 'preferButton'],
        },
      ],
    },
  },

  // Import rules
  {
    files: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'],
    plugins: { import: importPlugin },
    rules: {
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
        },
      ],
    },
  },

  // Node.js scripts (e.g., .mjs files)
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Add any .mjs-specific rules here if needed
    },
  },

  // Node.js scripts (e.g., scripts folder)
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Exclude the `dist/` folder
  {
    ignores: ['**/dist/**'],
  },
];
