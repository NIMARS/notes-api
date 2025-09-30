// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import jest from "eslint-plugin-jest";

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: "./tsconfig.eslint.json",
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
        },
    },
    {
        files: ["**/*.test.ts"],
        plugins: { jest },
        rules: {
            "jest/no-disabled-tests": "warn",
            "jest/no-focused-tests": "error",
            "jest/no-identical-title": "error",
        },
    },
];
