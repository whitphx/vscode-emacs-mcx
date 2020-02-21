import * as assert from "assert";
import * as vscode from "vscode";
import { Position, Range, Selection, TextEditor } from "vscode";

export async function setupWorkspace(
  initialText = "",
  {
    eol = vscode.EndOfLine.LF,
    language = "text"
  }: {
    eol?: vscode.EndOfLine;
    language?: string;
  } = {}
): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument({
    content: initialText,
    language
  });

  await vscode.window.showTextDocument(doc);

  const activeTextEditor = vscode.window.activeTextEditor;
  assert.ok(activeTextEditor);

  // Set EOL to LF for the tests to work even on Windows
  (activeTextEditor as TextEditor).edit(editBuilder =>
    editBuilder.setEndOfLine(eol)
  );

  return activeTextEditor!;
}

export async function clearTextEditor(
  textEditor: TextEditor,
  initializeWith = ""
) {
  const doc = textEditor.document;
  await textEditor.edit(editBuilder => {
    editBuilder.delete(
      new Range(new Position(0, 0), doc.positionAt(doc.getText().length))
    );
  });
  await textEditor.edit(editBuilder => {
    editBuilder.insert(new Position(0, 0), initializeWith);
  });
  assert.equal(doc.getText(), initializeWith);
}

export function setEmptyCursors(
  textEditor: TextEditor,
  ...positions: Array<[number, number]>
) {
  textEditor.selections = positions.map(
    p => new Selection(new Position(p[0], p[1]), new Position(p[0], p[1]))
  );
}

export async function cleanUpWorkspace() {
  return;
}

export function assertTextEqual(textEditor: TextEditor, expectedText: string) {
  assert.equal(textEditor.document.getText(), expectedText);
}

export function assertCursorsEqual(
  textEditor: TextEditor,
  ...positions: Array<[number, number]>
) {
  assert.equal(textEditor.selections.length, positions.length);
  textEditor.selections.forEach((selection, idx) => {
    const pos = positions[idx];
    assert.ok(
      selection.isEqual(
        new Range(new Position(pos[0], pos[1]), new Position(pos[0], pos[1]))
      )
    );
  });
}
