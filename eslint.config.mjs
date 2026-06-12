import nextConfig from 'eslint-config-next';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const eslintConfig = [
  ...nextConfig,
  prettierConfig,
  ...tseslint.configs.recommended,
  {
    // Pin the React version so eslint-plugin-react skips auto-detection, which
    // calls the legacy context.getFilename() API that was removed in ESLint 10.
    settings: {
      react: { version: '19' },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-empty-interface': 'error',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'prisma/items.ts', '.claude/**'],
  },
];

export default eslintConfig;
