import { FlatCompat } from '@eslint/eslintrc';

// FlatCompat is needed while on Next.js 15
const compat = new FlatCompat({
    baseDirectory: import.meta.dirname,
});

const eslintConfig = [
    ...compat.extends(
        'next/core-web-vitals',
        'next/typescript',
        'prettier',
        'plugin:@typescript-eslint/recommended',
    ),
    {
        rules: {
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-empty-object-type': 'error',
            '@typescript-eslint/no-empty-interface': 'error',
        },
    },
    {
        ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'prisma/items.ts'],
    },
];

export default eslintConfig;
