/** @type {import('eslint').Linter.Config} */
export default {
  root: true,
  env: { node: true, es2022: true, jest: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { project: false, sourceType: "module", ecmaVersion: "latest", },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "eslint-config-prettier"
  ],
  ignorePatterns: ["dist/", "node_modules/"],
  rules: {
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-misused-promises": ["error", { "checksVoidReturn": { "arguments": false } }]
  }
};
