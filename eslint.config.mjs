import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import obsidianmdPlugin from "eslint-plugin-obsidianmd";
import js from "@eslint/js";

export default [
  {
    ignores: [
      "coverage/**"
    ],
  },
  {
    languageOptions: {
      globals: {
        process: "readonly",
        window: "readonly",
        document: "readonly",
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
      ...tsPlugin.configs.recommended.rules,
      // Obsidian settings
      ...obsidianmdPlugin.configs.recommended.rules,
    },
  },
];
