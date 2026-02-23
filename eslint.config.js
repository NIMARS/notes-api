import js from "@eslint/js";
import tseslint from "typescript-eslint";
import vitest from "eslint-plugin-vitest";

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            "coverage/**",
            "scripts/**",
            "deleted/**"
        ],
    },
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: "./tsconfig.eslint.json",
            },
        },
        rules: {
            "no-unused-vars": "off", //"warn",
            "no-console": "off",
        },
    },

    // TEST FILES
    {
        files: ["src/**/*.ts", "tests/**/*.ts", "prisma/**/*.ts"],
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
