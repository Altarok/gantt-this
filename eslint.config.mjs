// import tsPlugin from "@typescript-eslint/eslint-plugin";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmdPlugin from "eslint-plugin-obsidianmd";

export default [
  {
    ignores: [
      "coverage/**",
      "main.js",
      "styles.css",
      "esbuild.config.mjs",
      ".obsidian/"
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    plugins: {
      "obsidianmd": obsidianmdPlugin,
    },
    languageOptions: {
      globals: {
        process: "readonly",
        window: "readonly",
      },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      ...obsidianmdPlugin.configs.recommended.rules,
      // "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", {"args": "none"}],
      // "@typescript-eslint/ban-ts-comment": "off",
      // "no-prototype-builtins": "off",
      // "@typescript-eslint/no-empty-function": "off",
      // "@typescript-eslint/no-explicit-any": "off"
    }
  }
];
