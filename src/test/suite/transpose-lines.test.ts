import assert from "assert";
import * as vscode from "vscode";
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
    // Place cursor on line 2
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

    // Cursor should move to beginning of next line
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

  test("First line transposes with second line", async () => {
    // Place cursor on line 1
    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.runCommand("transposeLines");

    // Lines 1 and 2 should be swapped
    assert.strictEqual(
      activeTextEditor.document.getText(),
      `line 2
line 1
line 3
line 4
line 5`,
    );

    // Cursor should move to beginning of line 3
    assertCursorsEqual(activeTextEditor, [2, 0]);
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

  test("Transpose with mark mode (single line selection)", async () => {
    // Create a selection on line 2
    setEmptyCursors(activeTextEditor, [1, 0]);
    emulator.enterMarkMode();
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");

    // Verify mark mode is active with selection
    assert.ok(emulator.isInMarkMode);
    assert.ok(!activeTextEditor.selections[0]!.isEmpty);

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

    // Mark mode should be exited
    assert.ok(!emulator.isInMarkMode);
  });

  test("Transpose with mark mode (multi-line selection)", async () => {
    // Create a multi-line selection starting from line 2
    setEmptyCursors(activeTextEditor, [1, 0]);
    emulator.enterMarkMode();
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");

    // Verify mark mode is active with multi-line selection
    assert.ok(emulator.isInMarkMode);
    assert.ok(!activeTextEditor.selections[0]!.isEmpty);
    assert.strictEqual(activeTextEditor.selections[0]!.start.line, 1);
    assert.strictEqual(activeTextEditor.selections[0]!.end.line, 2);

    await emulator.runCommand("transposeLines");

    // Transpose is based on active line (line 3), so lines 2 and 3 are swapped
    assert.strictEqual(
      activeTextEditor.document.getText(),
      `line 1
line 3
line 2
line 4
line 5`,
    );

    // Cursor should move to next line after the active line
    assertCursorsEqual(activeTextEditor, [3, 0]);

    // Mark mode should be exited
    assert.ok(!emulator.isInMarkMode);
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

    // Cursor moves to next line
    assertCursorsEqual(activeTextEditor, [2, 0]);

    // Second transpose swaps "line 1" with "line 3"
    await emulator.runCommand("transposeLines");

    assert.strictEqual(
      activeTextEditor.document.getText(),
      `line 2
line 3
line 1
line 4
line 5`,
    );

    // Cursor moves to next line again
    assertCursorsEqual(activeTextEditor, [3, 0]);
  });

  test("Transpose last line", async () => {
    // Place cursor on last line
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

    // Cursor should move to next line (beyond the document)
    assertCursorsEqual(activeTextEditor, [5, 0]);
  });

  test("Transpose adjacent lines with multi-cursor", async () => {
    // Place cursors on adjacent lines 2 and 3
    setEmptyCursors(activeTextEditor, [1, 0], [2, 0]);

    await emulator.runCommand("transposeLines");

    // Transpositions are processed sequentially top-to-bottom:
    // Line 2 swaps with line 1, then line 3 swaps with the line now at position 2 (which is now line 2 after the first swap).
    assert.strictEqual(
      activeTextEditor.document.getText(),
      `line 2
line 3
line 1
line 4
line 5`,
    );
  });

  test("Cursors on lines 1 and 2 both transpose lines 1 and 2", async () => {
    // Place cursors on lines 1 and 2
    setEmptyCursors(activeTextEditor, [0, 0], [1, 0]);

    await emulator.runCommand("transposeLines");

    // Both should transpose the same pair (lines 1 and 2), so only one swap occurs
    assert.strictEqual(
      activeTextEditor.document.getText(),
      `line 2
line 1
line 3
line 4
line 5`,
    );

    // Both cursors should move to line 3
    assertCursorsEqual(activeTextEditor, [2, 0], [2, 0]);
  });
});
