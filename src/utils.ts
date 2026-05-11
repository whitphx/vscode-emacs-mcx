import * as vscode from "vscode";
import { Position, Range, TextDocument, TextEditor } from "vscode";

export function equalPositions(positions1: readonly Position[], positions2: readonly Position[]): boolean {
  if (positions1.length !== positions2.length) {
    return false;
  }
  return positions1.every((p1, i) => p1.isEqual(positions2[i]!));
}

export function delay(time?: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time));
}

// Wait until `document` has not emitted an `onDidChangeTextDocument` event for
// `settleMs`, or until `timeoutMs` elapses, whichever comes first. Used to
// wait for asynchronous editor follow-ups (e.g. `OnEnter` rule auto-indent)
// that arrive after the triggering command's promise has already resolved.
export async function waitForDocumentToSettle(
  document: TextDocument,
  { settleMs = 100, timeoutMs = 1000 }: { settleMs?: number; timeoutMs?: number } = {},
): Promise<void> {
  let lastChangeAt = Date.now();
  const disposable = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document === document) {
      lastChangeAt = Date.now();
    }
  });
  try {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const sinceLastChange = Date.now() - lastChangeAt;
      if (sinceLastChange >= settleMs) {
        return;
      }
      await delay(Math.min(settleMs - sinceLastChange, 20));
    }
  } finally {
    disposable.dispose();
  }
}

// HACK: Currently there is no official type-safe way to handle
//       the unsafe inputs such as the arguments of the extensions.
// See: https://github.com/microsoft/TypeScript/issues/37700#issuecomment-940865298
export type Unreliable<T> = { [P in keyof T]?: Unreliable<T[P]> } | Array<Unreliable<T>> | undefined;

export async function deleteRanges(textEditor: TextEditor, ranges: Range[], maxTrials = 3): Promise<boolean> {
  let success = false;
  let trial = 0;
  while (!success && trial < maxTrials) {
    success = await textEditor.edit((editBuilder) => {
      ranges.forEach((range) => {
        editBuilder.delete(range);
      });
    });
    trial++;
  }

  return success;
}
