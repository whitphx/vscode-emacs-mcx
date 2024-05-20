// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config({
  ignores: ["src/vs/**"],
  extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "textEditor|isInMarkMode|prefixArgument",
      },
    ],
  },
});
