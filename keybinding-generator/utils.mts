export function addWhenCond(base: string | undefined, additional: string): string {
  if (!base || base.trim() === "") {
    return additional;
  }
  // XXX: This logic is not fully tested!
  if (base.includes("||") && !base.trim().match(/\)\s*$/)) {
    base = `(${base})`;
  }
  if (additional.includes("||") && !additional.trim().match(/^\s*!?\(/)) {
    additional = `(${additional})`;
  }
  return `${base} && ${additional}`;
}
