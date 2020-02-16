import * as assert from "assert";
import * as vscode from "vscode";
import {Position, Range, Selection, TextEditor} from "vscode";

export async function setupWorkspace(
    initialText: string = "",
    {
        eol = vscode.EndOfLine.LF,
        language = "text",
    }: {
        eol?: vscode.EndOfLine,
        language?: string,
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

    await tick();

    assertTextEqual(activeTextEditor as TextEditor, initialText);

    return activeTextEditor!;
}

export async function clearTextEditor(textEditor: TextEditor, initializeWith: string = "") {
    const doc = textEditor.document;
    await textEditor.edit((editBuilder) => {
        editBuilder.delete(new Range(
            new Position(0, 0),
            doc.positionAt(doc.getText().length),
        ));
    });
    await textEditor.edit((editBuilder) => {
        editBuilder.insert(
            new Position(0, 0),
            initializeWith,
        );
    });
    assert.equal(doc.getText(), initializeWith);
}

export function setEmptyCursors(textEditor: TextEditor, ...positions: Array<[number, number]>) {
    textEditor.selections = positions.map((p) =>
        new Selection(new Position(p[0], p[1]), new Position(p[0], p[1])));
}

// This function is copied from https://github.com/VSCodeVim/Vim/blob/3ad7cbdd1fc568d6959407610b2f2d151faf654b/test/testUtils.ts#L129
export async function cleanUpWorkspace(): Promise<void> {
  return new Promise((c, e) => {
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

    vscode.commands.executeCommand('workbench.action.closeAllEditors').then(
      () => null,
      (err: any) => {
        clearInterval(interval);
        e(err);
      }
    );
  }).then(() => {
    assert.strictEqual(vscode.window.visibleTextEditors.length, 0, 'Expected all editors closed.');
    assert(!vscode.window.activeTextEditor, 'Expected no active text editor.');
  });
}

export function assertTextEqual(textEditor: TextEditor, expectedText: string) {
    assert.equal(textEditor.document.getText(), expectedText);
}

export function assertCursorsEqual(textEditor: TextEditor, ...positions: Array<[number, number]>) {
    assert.equal(textEditor.selections.length, positions.length);
    textEditor.selections.forEach((selection, idx) => {
        const pos = positions[idx];
        assert.ok(
            selection.isEqual(new Range(new Position(pos[0], pos[1]), new Position(pos[0], pos[1]))));
    });
}

export function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}
