import assert from "assert";
import * as vscode from "vscode";
import { EmacsEmulator } from "../../emulator";
import { cleanUpWorkspace, setupWorkspace, setEmptyCursors, assertSelectionsEqual } from "./utils";

suite("Emulator with multiple TextEditors on the same document", () => {
  let firstTextEditor: vscode.TextEditor;
  let secondTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = `0123456789
abcdefghij
ABCDEFGHIJ
klmnopqrst
KLMNOPQRST`;
    firstTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(firstTextEditor);

    // Also, open another editor on the same document.
    await vscode.window.showTextDocument(firstTextEditor.document, vscode.ViewColumn.Two);
    secondTextEditor = vscode.window.activeTextEditor as vscode.TextEditor;

    // Ensure that the activeTextEditor is still the first one.
    await vscode.window.showTextDocument(firstTextEditor.document, vscode.ViewColumn.One);
    assert.strictEqual(vscode.window.activeTextEditor, firstTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("the mark mode and the anchor positions are shared among the editors on the same document", async () => {
    // Set the cursor position on the second editor to a different position from the first editor.
    emulator.setTextEditor(secondTextEditor);
    setEmptyCursors(secondTextEditor, [2, 2]);

    // On the first editor, set the mark and move the cursor.
    await emulator.switchTextEditor(firstTextEditor);
    setEmptyCursors(firstTextEditor, [0, 0]);
    emulator.setMarkCommand();
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    assert.strictEqual(emulator.isInMarkMode, true);
    assertSelectionsEqual(firstTextEditor, new vscode.Selection(0, 0, 1, 1));

    // Focus on the second editor.
    await emulator.switchTextEditor(secondTextEditor); // This is called in onDidChangeActiveTextEditor event handler in extension.ts in the real case.

    // The mark mode and the anchor position should be shared.
    assert.strictEqual(emulator.isInMarkMode, true);
    assertSelectionsEqual(secondTextEditor, new vscode.Selection(0, 0, 2, 2));

    // Focus back to the first editor, and assert that the mark mode and the cursor positions have not been changed.
    await emulator.switchTextEditor(firstTextEditor); // This is called in onDidChangeActiveTextEditor event handler in extension.ts in the real case.
    assert.strictEqual(emulator.isInMarkMode, true);
    assertSelectionsEqual(firstTextEditor, new vscode.Selection(0, 0, 1, 1));

    // Disable the mark mode on the first editor.
    emulator.cancel();
    assert.strictEqual(emulator.isInMarkMode, false);
    assertSelectionsEqual(firstTextEditor, new vscode.Selection(1, 1, 1, 1));

    // Focus on the second editor and assert that the mark mode has been disabled.
    await emulator.switchTextEditor(secondTextEditor); // This is called in onDidChangeActiveTextEditor event handler in extension.ts in the real case.
    assert.strictEqual(emulator.isInMarkMode, false);
    assertSelectionsEqual(secondTextEditor, new vscode.Selection(2, 2, 2, 2));
  });

  test("The rectangle mark mode and the anchor positions are shared among the editors on the same document", async () => {
    // Set the cursor position on the second editor to a different position from the first editor.
    emulator.setTextEditor(secondTextEditor);
    setEmptyCursors(secondTextEditor, [3, 3]);

    // On the first editor, start the rectangle mark mode and move the cursor.
    emulator.setTextEditor(firstTextEditor);
    setEmptyCursors(firstTextEditor, [0, 0]);
    emulator.rectangleMarkMode();
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    assert.strictEqual(emulator.inRectMarkMode, true);
    assertSelectionsEqual(
      firstTextEditor,
      new vscode.Selection(0, 0, 0, 2),
      new vscode.Selection(1, 0, 1, 2),
      new vscode.Selection(2, 0, 2, 2),
    ); // Selected region is a rectangle.

    // Focus on the second editor.
    await emulator.switchTextEditor(secondTextEditor); // This is called in onDidChangeActiveTextEditor event handler in extension.ts in the real case.

    // The mark mode and the anchor position should be shared.
    assert.strictEqual(emulator.inRectMarkMode, true);
    assertSelectionsEqual(
      secondTextEditor,
      new vscode.Selection(0, 0, 0, 3),
      new vscode.Selection(1, 0, 1, 3),
      new vscode.Selection(2, 0, 2, 3),
      new vscode.Selection(3, 0, 3, 3),
    ); // Selected region is a rectangle.

    // Focus back to the first editor, and assert that the mark mode and the cursor positions have not been changed.
    await emulator.switchTextEditor(firstTextEditor); // This is called in onDidChangeActiveTextEditor event handler in extension.ts in the real case.
    assert.strictEqual(emulator.inRectMarkMode, true);
    assertSelectionsEqual(
      firstTextEditor,
      new vscode.Selection(0, 0, 0, 2),
      new vscode.Selection(1, 0, 1, 2),
      new vscode.Selection(2, 0, 2, 2),
    ); // Selected region is a rectangle.

    // Disable the mark mode on the first editor.
    emulator.cancel();
    assert.strictEqual(emulator.inRectMarkMode, false);
    assertSelectionsEqual(firstTextEditor, new vscode.Selection(2, 2, 2, 2));

    // Focus on the second editor and assert that the mark mode has been disabled.
    await emulator.switchTextEditor(secondTextEditor); // This is called in onDidChangeActiveTextEditor event handler in extension.ts in the real case.
    assert.strictEqual(emulator.inRectMarkMode, false);
    assertSelectionsEqual(secondTextEditor, new vscode.Selection(3, 3, 3, 3));
  });
});
