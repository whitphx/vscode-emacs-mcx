// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import path from "node:path";

const config = tseslint.config(
  {
    basePath: "src",
    ignores: ["vs/**"],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    // Ref: https://typescript-eslint.io/getting-started/typed-linting/
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
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
);

export default config;
