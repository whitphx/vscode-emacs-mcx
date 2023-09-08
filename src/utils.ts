import { Position } from "vscode";

export function equalPositions(positions1: Position[], positions2: Position[]): boolean {
  if (positions1.length !== positions2.length) {
    return false;
  }
  return positions1.every((p1, i) => p1.isEqual(positions2[i]!)); // eslint-disable-line @typescript-eslint/no-non-null-assertion
}

export function delay(time?: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time));
}
