import assert from "assert";
import * as vscode from "vscode";
import { Position, Selection } from "vscode";
import { EmacsEmulator } from "../../emulator";
import { createEmulator, cleanUpWorkspace, setupWorkspace, setEmptyCursors, assertCursorsEqual } from "./utils";

suite("transpose-lines", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = `line 1
line 2
line 3
line 4
line 5`;
    activeTextEditor = await setupWorkspace(initialText);
    emulator = createEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("Basic transpose: swap current line with previous line", async () => {
    // Place cursor on line 2 (index 1)
    setEmptyCursors(activeTextEditor, [1, 0]);

    await emulator.runCommand("transposeLines");

    assert.strictEqual(
      activeTextEditor.document.getText(),
      `line 2
line 1
line 3
line 4
line 5`,
    );

    // Cursor should move to beginning of next line (line 3, index 2)
    assertCursorsEqual(activeTextEditor, [2, 0]);
  });

  test("Transpose from middle of line", async () => {
    // Place cursor in middle of line 2
    setEmptyCursors(activeTextEditor, [1, 3]);

    await emulator.runCommand("transposeLines");

    assert.strictEqual(
      activeTextEditor.document.getText(),
      `line 2
line 1
line 3
line 4
line 5`,
    );

    // Cursor should still move to beginning of next line
    assertCursorsEqual(activeTextEditor, [2, 0]);
  });

  test("First line should not transpose (no previous line)", async () => {
    // Place cursor on line 1 (index 0)
    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.runCommand("transposeLines");

    // Text should remain unchanged
    assert.strictEqual(
      activeTextEditor.document.getText(),
      `line 1
line 2
line 3
line 4
line 5`,
    );

    // Cursor should remain on line 1
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });

  test("Multi-cursor transpose", async () => {
    // Place cursors on lines 2 and 4
    setEmptyCursors(activeTextEditor, [1, 0], [3, 0]);

    await emulator.runCommand("transposeLines");

    assert.strictEqual(
      activeTextEditor.document.getText(),
      `line 2
line 1
line 4
line 3
line 5`,
    );

    // Both cursors should move down
    assertCursorsEqual(activeTextEditor, [2, 0], [4, 0]);
  });

  test("Transpose with mark mode (selection)", async () => {
    // Create a selection on line 2
    activeTextEditor.selections = [new Selection(new Position(1, 0), new Position(1, 4))];
    emulator.enterMarkMode();

    await emulator.runCommand("transposeLines");

    assert.strictEqual(
      activeTextEditor.document.getText(),
      `line 2
line 1
line 3
line 4
line 5`,
    );

    // Cursor should move to next line
    assertCursorsEqual(activeTextEditor, [2, 0]);
  });

  test("Sequential transpose moves line down two positions", async () => {
    // Start on line 2
    setEmptyCursors(activeTextEditor, [1, 0]);

    // First transpose
    await emulator.runCommand("transposeLines");

    assert.strictEqual(
      activeTextEditor.document.getText(),
      `line 2
line 1
line 3
line 4
line 5`,
    );

    // Cursor is now on line 3 (index 2)
    assertCursorsEqual(activeTextEditor, [2, 0]);

    // Second transpose - this will swap "line 1" (now at index 1) with "line 3" (at index 2)
    await emulator.runCommand("transposeLines");

    assert.strictEqual(
      activeTextEditor.document.getText(),
      `line 2
line 3
line 1
line 4
line 5`,
    );

    // Cursor should be on line 4 (index 3)
    assertCursorsEqual(activeTextEditor, [3, 0]);
  });

  test("Transpose last line", async () => {
    // Place cursor on last line (line 5, index 4)
    setEmptyCursors(activeTextEditor, [4, 0]);

    await emulator.runCommand("transposeLines");

    assert.strictEqual(
      activeTextEditor.document.getText(),
      `line 1
line 2
line 3
line 5
line 4`,
    );

    // Cursor should move to next line (which would be beyond the document, so line 5)
    assertCursorsEqual(activeTextEditor, [5, 0]);
  });

  test("Transpose adjacent lines with multi-cursor", async () => {
    // Place cursors on adjacent lines 2 and 3
    setEmptyCursors(activeTextEditor, [1, 0], [2, 0]);

    await emulator.runCommand("transposeLines");

    // Line 2 swaps with line 1, line 3 swaps with line 2 (now original line 1)
    assert.strictEqual(
      activeTextEditor.document.getText(),
      `line 2
line 3
line 1
line 4
line 5`,
    );
  });
});
