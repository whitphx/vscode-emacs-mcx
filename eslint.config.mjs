// @ts-check

import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import mochaPlugin from "eslint-plugin-mocha";

import path from "node:path";

const config = defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  globalIgnores(["src/vs/**"]),
  {
    // Ref: https://typescript-eslint.io/getting-started/typed-linting/
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Ref: https://typescript-eslint.io/troubleshooting/typed-linting/#how-can-i-disable-type-aware-linting-for-a-set-of-files
    files: ["**/*.js", "**/*.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    basePath: "src",
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "textEditor|isInMarkMode|prefixArgument",
        },
      ],
    },
  },
  {
    basePath: "keybinding-generator",
    ignores: ["run-in-vscode/**/*"],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    // Ref: https://typescript-eslint.io/getting-started/typed-linting/
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: path.join(import.meta.dirname, "keybinding-generator"),
      },
    },
  },
  {
    files: ["**/*.test.ts"],
    plugins: {
      mocha: mochaPlugin,
    },
    rules: {
      "mocha/no-exclusive-tests": "error",
    },
  },
);

export default config;
