module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['standard', 'plugin:@typescript-eslint/recommended', 'prettier'],
  ignorePatterns: ['node_modules/**', 'dist/**', 'coverage/**'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { vars: 'all', args: 'after-used', ignoreRestSiblings: false, argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'comma-dangle': 'off',
  },
};
