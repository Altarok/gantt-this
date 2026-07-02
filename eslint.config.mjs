import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import obsidianmdPlugin from "eslint-plugin-obsidianmd";
import js from "@eslint/js";

export default [
  {
    ignores: [
      "coverage/**",
      "main.js"
    ],
  },
  {
    languageOptions: {
      globals: {
        process: "readonly",
        window: "readonly",
      },
    },
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      sourceType: "module",
      parserOptions: {
        project: "./tsconfig.json", // point ESLint to TS-config
        tsconfigRootDir: import.meta.dirname, // Set correct path independent of OS
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "obsidianmd": obsidianmdPlugin,
    },
    rules: {
      // default settings
      ...js.configs.recommended.rules,

      // LEVEL 11: Switch from basic recommended to strict type-aware rules
      ...tsPlugin.configs["recommended-type-checked"].rules,
      ...tsPlugin.configs["stylistic-type-checked"].rules,

      // Obsidian settings
      ...obsidianmdPlugin.configs.recommended.rules,

      // Prevent shipping floating asynchronous operations inside your timer loops
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",

      // Enforce clean, modernized type structures
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-explicit-any": "warn",

      // Nullish-coalescing guard rails (perfect for your UI state evaluations)
      "@typescript-eslint/prefer-nullish-coalescing": "warn",

      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ]

    }
  }
];
