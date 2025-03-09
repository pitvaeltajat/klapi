import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({
  // import.meta.dirname is available after Node.js v20.11.0
  baseDirectory: import.meta.dirname,
});
const eslintConfig = [
  ...compat.config({
    extends: ["next", "prettier", "plugin:@typescript-eslint/recommended"],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-empty-interface": "error",
    },
  }),
];
export default eslintConfig;
