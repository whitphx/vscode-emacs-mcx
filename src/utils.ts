import { Position } from "vscode";

export function equalPositions(positions1: Position[], positions2: Position[]): boolean {
  if (positions1.length !== positions2.length) {
    return false;
  }
  return positions1.every((p1, i) => p1.isEqual(positions2[i]!));
}

export function delay(time?: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time));
}

// HACK: Currently there is no official type-safe way to handle
//       the unsafe inputs such as the arguments of the extensions.
// See: https://github.com/microsoft/TypeScript/issues/37700#issuecomment-940865298
export type Unreliable<T> = { [P in keyof T]?: Unreliable<T[P]> } | Array<Unreliable<T>> | undefined;
