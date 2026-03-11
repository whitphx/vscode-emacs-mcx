import jsep from "jsep";

export function evaluateSimpleBooleanExpression(
  expr: string,
  context: Record<string, boolean | string>,
  defaultContextValue: boolean,
): boolean {
  // Use jsep to parse the expression.
  const ast = jsep(expr);

  // Recursive AST evaluator
  function maybeEvaluate(
    node: jsep.Expression | jsep.baseTypes | (jsep.Expression | jsep.baseTypes)[],
  ): jsep.baseTypes {
    if (
      typeof node === "boolean" ||
      typeof node === "string" ||
      typeof node === "number" ||
      node === null ||
      node === undefined ||
      node instanceof RegExp
    ) {
      return node;
    }

    if (Array.isArray(node)) {
      throw new Error(`Unexpected array in expression: ${JSON.stringify(node)}`);
    }

    return evaluate(node as unknown as jsep.Expression);
  }
  function evaluate(node: jsep.Expression): jsep.baseTypes {
    switch (node.type) {
      case "Literal": {
        if (
          typeof node.value === "boolean" ||
          typeof node.value === "number" ||
          typeof node.value === "string" ||
          node.value === null
        ) {
          return node.value;
        }
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        throw new Error(`Unsupported literal value: ${String(node.value)}`);
      }
      case "Identifier": {
        if (node.name === "true") return true;
        if (node.name === "false") return false;
        if (typeof node.name === "string" && node.name in context) {
          return context[node.name];
        }
        return defaultContextValue;
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
          case "==":
            return left === right;
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
      case "MemberExpression":
        return defaultContextValue; // XXX: Don't support member expressions and just return the default value for now because it's not needed for the use case in this extension.
      default:
        throw new Error(`Unsupported node type: ${node.type} (${JSON.stringify(node)})`);
    }
  }

  return Boolean(evaluate(ast));
}
