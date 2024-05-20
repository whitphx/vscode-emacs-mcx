import assert from "assert";
import * as vscode from "vscode";
import { Position, Range, Selection, TextEditor } from "vscode";
export { delay } from "../../utils";

export async function setupWorkspace(
  initialText = "",
  {
    eol = vscode.EndOfLine.LF,
    language = "text",
  }: {
    eol?: vscode.EndOfLine;
    language?: string;
  } = {},
): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument({
    content: initialText,
    language,
  });

  await vscode.window.showTextDocument(doc);

  const activeTextEditor = vscode.window.activeTextEditor;
  assert.ok(activeTextEditor);

  // Set EOL to LF for the tests to work even on Windows
  await (activeTextEditor as TextEditor).edit((editBuilder) => editBuilder.setEndOfLine(eol));

  return activeTextEditor as TextEditor;
}

export async function clearTextEditor(textEditor: TextEditor, initializeWith = ""): Promise<void> {
  const doc = textEditor.document;
  await textEditor.edit((editBuilder) => {
    editBuilder.delete(new Range(new Position(0, 0), doc.positionAt(doc.getText().length)));
  });
  await textEditor.edit((editBuilder) => {
    editBuilder.insert(new Position(0, 0), initializeWith);
  });
  assert.strictEqual(doc.getText(), initializeWith);
}

export function setEmptyCursors(textEditor: TextEditor, ...positions: Array<[number, number]>): void {
  textEditor.selections = positions.map((p) => new Selection(new Position(p[0], p[1]), new Position(p[0], p[1])));
}

export async function cleanUpWorkspace(): Promise<void> {
  // If the panel is visible, its child editors can appear in `vscode.window.visibleTextEditors` and they cannot be closed with the `workbench.action.closeAllEditors`.
  // and it leads to timeout during the following polling process.
  // So we explicitly close the panel here.
  await vscode.commands.executeCommand("workbench.action.closePanel");

  return new Promise<void>((c, e) => {
    if (vscode.window.visibleTextEditors.length === 0) {
      return c();
    }

    // TODO: the visibleTextEditors variable doesn't seem to be
    // up to date after a onDidChangeActiveTextEditor event, not
    // even using a setTimeout 0... so we MUST poll :(
    const interval = setInterval(() => {
      if (vscode.window.visibleTextEditors.length > 0) {
        return;
      }

      clearInterval(interval);
      c();
    }, 10);

    vscode.commands.executeCommand("workbench.action.closeAllEditors").then(
      () => null,
      (err) => {
        clearInterval(interval);
        e(err);
      },
    );
  }).then(() => {
    assert.strictEqual(vscode.window.visibleTextEditors.length, 0, "Expected all editors closed.");
    assert(!vscode.window.activeTextEditor, "Expected no active text editor.");
  });
}

export function assertTextEqual(textEditor: TextEditor, expectedText: string): void {
  assert.strictEqual(textEditor.document.getText(), expectedText);
}

export function assertCursorsEqual(textEditor: TextEditor, ...positions: Array<[number, number]>): void {
  assert.strictEqual(textEditor.selections.length, positions.length);
  textEditor.selections.forEach((selection, idx) => {
    // `textEditor.selections.length === positions.length` has already been checked,
    // so noUncheckedIndexedAccess rule can be skipped here.
    const pos = positions[idx]!;
    const expectedRange = new Range(new Position(pos[0], pos[1]), new Position(pos[0], pos[1]));
    assert.ok(
      selection.isEqual(expectedRange),
      `${JSON.stringify(selection)} is not equal to ${JSON.stringify(expectedRange)}`,
    );
  });
}

export function assertSelectionsEqual(
  textEditor: TextEditor,
  ...selections: Array<Selection | [number, number, number, number]>
): void {
  assert.strictEqual(textEditor.selections.length, selections.length);
  textEditor.selections.forEach((actualSelection, idx) => {
    const maybeExpectedSelection = selections[idx];
    const expectSelection = Array.isArray(maybeExpectedSelection)
      ? new Selection(...maybeExpectedSelection)
      : maybeExpectedSelection;
    assert.deepStrictEqual(actualSelection, expectSelection);
  });
}
