import assert from "assert";
import { evaluateSimpleBooleanExpression } from "./simple-eval-bool.mjs";

describe("evaluateSimpleBooleanExpression", () => {
  [
    { expr: "true && false", expected: false },
    { expr: "true || false", expected: true },
    { expr: "false && false", expected: false },
    { expr: "true && true", expected: true },
    { expr: "!true", expected: false },
    { expr: "!false", expected: true },
    { expr: "!(true && false)", expected: true },
  ].forEach(({ expr, expected }) => {
    it(`should evaluate "${expr}" to ${expected}`, () => {
      const result = evaluateSimpleBooleanExpression(expr);
      assert.strictEqual(result, expected);
    });
  });
});
