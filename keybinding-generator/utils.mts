function hasTopLevelOr(expr: string): boolean {
  let depth = 0;
  for (let i = 0; i < expr.length - 1; i++) {
    const char = expr[i];
    if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth--;
    } else if (char === "|" && expr[i + 1] === "|" && depth === 0) {
      return true;
    }
  }
  return false;
}

export function addWhenCond(base: string | undefined, additional: string): string {
  if (!base || base.trim() === "") {
    return additional;
  }
  // XXX: This logic is not fully tested!
  if (hasTopLevelOr(base)) {
    base = `(${base})`;
  }
  if (additional.includes("||") && !additional.trim().match(/^\s*!?\(/)) {
    additional = `(${additional})`;
  }
  return `${base} && ${additional}`;
}
