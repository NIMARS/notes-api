import js from "@eslint/js";
import tseslint from "typescript-eslint";
import vitest from "eslint-plugin-vitest";

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

    // TEST FILES
    {
        files: ["**/*.test.ts"],
        plugins: { vitest },
        languageOptions: {
            globals: vitest.environments.env.globals,
        },
        rules: {
            "vitest/no-disabled-tests": "warn",
            "vitest/no-focused-tests": "error",
            "vitest/no-identical-title": "error",
            "vitest/expect-expect": "warn"
        },
    },
];
