import jsep from "jsep";

export function evaluateSimpleBooleanExpression(expr: string): boolean {
  // Use jsep to parse the expression.
  const ast = jsep(expr);

  // Recursive AST evaluator
  function maybeEvaluate(node: jsep.Expression | jsep.baseTypes | (jsep.Expression | jsep.baseTypes)[]): boolean {
    if (Array.isArray(node)) {
      return node.every(maybeEvaluate);
    }
    if (typeof node === "boolean") {
      return node;
    }
    if (
      typeof node === "string" ||
      typeof node === "number" ||
      node === null ||
      node === undefined ||
      node instanceof RegExp
    ) {
      throw new Error(`Unexpected primitive value in expression: ${String(node)}`);
    }

    return evaluate(node as unknown as jsep.Expression);
  }
  function evaluate(node: jsep.Expression): boolean {
    switch (node.type) {
      case "Literal": {
        if (typeof node.value === "boolean") {
          return node.value;
        }
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        throw new Error(`Unsupported literal value: ${String(node.value)}`);
      }
      case "Identifier": {
        if (node.name === "true") return true;
        if (node.name === "false") return false;
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        throw new Error(`Unknown identifier: ${String(node.name)}`);
      }
      case "LogicalExpression":
      case "BinaryExpression": {
        const left = maybeEvaluate(node.left);
        const right = maybeEvaluate(node.right);
        switch (node.operator) {
          case "&&":
            return left && right;
          case "||":
            return left || right;
          default:
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            throw new Error(`Unsupported logical operator: ${String(node.operator)}`);
        }
      }
      case "UnaryExpression": {
        const argument = maybeEvaluate(node.argument);
        switch (node.operator) {
          case "!":
            return !argument;
          default:
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            throw new Error(`Unsupported unary operator: ${String(node.operator)}`);
        }
      }
      default:
        throw new Error(`Unsupported node type: ${node.type}`);
    }
  }

  return evaluate(ast);
}
