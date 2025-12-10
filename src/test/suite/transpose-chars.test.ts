import assert from "assert";
import * as vscode from "vscode";
import { EmacsEmulator } from "../../emulator";
import {
  createEmulator,
  cleanUpWorkspace,
  setupWorkspace,
  setEmptyCursors,
  assertCursorsEqual,
  assertTextEqual,
} from "./utils";

// cSpell:words abdcefgh abcdefhg

suite("transpose-chars", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = `abcdefgh`;
    activeTextEditor = await setupWorkspace(initialText);
    emulator = createEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("Basic transpose: swap character before point with character after point", async () => {
    // Place cursor at position 3 (between 'c' and 'd')
    // Character before point: 'c' (index 2)
    // Character at point: 'd' (index 3)
    setEmptyCursors(activeTextEditor, [0, 3]);

    await emulator.runCommand("transposeChars");

    // Swaps 'c' and 'd'
    assertTextEqual(activeTextEditor, "abdcefgh");
    assertCursorsEqual(activeTextEditor, [0, 4]);
  });

  test("Transpose at end of line: transpose last two characters", async () => {
    // Place cursor at end of line (index 8)
    setEmptyCursors(activeTextEditor, [0, 8]);

    await emulator.runCommand("transposeChars");

    assertTextEqual(activeTextEditor, "abcdefhg");
    // Cursor stays at end
    assertCursorsEqual(activeTextEditor, [0, 8]);
  });

  test("Transpose at beginning of document: do nothing", async () => {
    // Place cursor at very beginning of document (line 0, char 0)
    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.runCommand("transposeChars");

    // No change
    assertTextEqual(activeTextEditor, "abcdefgh");
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });

  test("Sequential transpose moves character forward", async () => {
    // Start at position 2 (between 'b' and 'c')
    setEmptyCursors(activeTextEditor, [0, 2]);

    // First transpose: 'b' and 'c' swap
    await emulator.runCommand("transposeChars");
    assertTextEqual(activeTextEditor, "acbdefgh");
    assertCursorsEqual(activeTextEditor, [0, 3]);

    // Second transpose: now at position 3, swap 'b' and 'd'
    await emulator.runCommand("transposeChars");
    assertTextEqual(activeTextEditor, "acdbefgh");
    assertCursorsEqual(activeTextEditor, [0, 4]);
  });

  test("Multi-cursor transpose", async () => {
    // Place cursors at positions 2 and 5
    setEmptyCursors(activeTextEditor, [0, 2], [0, 5]);

    await emulator.runCommand("transposeChars");

    // At position 2: 'b' and 'c' swap
    // At position 5: 'e' and 'f' swap
    assertTextEqual(activeTextEditor, "acbdfegh");
    assertCursorsEqual(activeTextEditor, [0, 3], [0, 6]);
  });

  test("Transpose with prefix argument 2: move char before point forward by 2", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]);

    await emulator.digitArgument(2);
    await emulator.runCommand("transposeChars");

    assertTextEqual(activeTextEditor, "acdbefgh");
    assertCursorsEqual(activeTextEditor, [0, 4]);
  });

  test("Transpose with prefix argument 3: move char before point forward by 3", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]);

    await emulator.digitArgument(3);
    await emulator.runCommand("transposeChars");

    assertTextEqual(activeTextEditor, "acdebfgh");
    assertCursorsEqual(activeTextEditor, [0, 5]);
  });

  test("Transpose with negative prefix argument (-1): move char before point backward by 1", async () => {
    setEmptyCursors(activeTextEditor, [0, 4]);

    await emulator.negativeArgument();
    await emulator.runCommand("transposeChars");

    assertTextEqual(activeTextEditor, "abdcefgh");
    assertCursorsEqual(activeTextEditor, [0, 3]);
  });

  test("Transpose with negative prefix argument (-2): move char before point backward by 2", async () => {
    setEmptyCursors(activeTextEditor, [0, 4]);

    await emulator.negativeArgument();
    await emulator.subsequentArgumentDigit(2);
    await emulator.runCommand("transposeChars");

    assertTextEqual(activeTextEditor, "adbcefgh");
    assertCursorsEqual(activeTextEditor, [0, 2]);
  });

  test("Transpose at beginning with negative prefix does nothing", async () => {
    // Start at beginning
    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.negativeArgument();
    await emulator.runCommand("transposeChars");

    // No change
    assertTextEqual(activeTextEditor, "abcdefgh");
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });

  test("Transpose with line too short (less than 2 characters)", async () => {
    const shortText = `a`;
    activeTextEditor = await setupWorkspace(shortText);
    emulator = createEmulator(activeTextEditor);

    setEmptyCursors(activeTextEditor, [0, 1]);

    await emulator.runCommand("transposeChars");

    // No change on the text
    assertTextEqual(activeTextEditor, "a");
    // Cursor moves to the beginning
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });

  test("Transpose with prefix argument beyond line end: cursor moves to end", async () => {
    // Start at position 2
    setEmptyCursors(activeTextEditor, [0, 2]);

    // Try to transpose with offset 10 (beyond line end)
    await emulator.digitArgument(1);
    await emulator.subsequentArgumentDigit(0);
    await emulator.runCommand("transposeChars");

    // No change on the text
    assertTextEqual(activeTextEditor, "abcdefgh");
    // Cursor moves to the end of the buffer
    assertCursorsEqual(activeTextEditor, [0, 8]);
  });

  test("Transpose with mark mode active", async () => {
    // Place cursor at position 3
    setEmptyCursors(activeTextEditor, [0, 3]);

    // Enter mark mode and create selection
    emulator.enterMarkMode();
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");

    // Verify mark mode is active
    assert.ok(emulator.isInMarkMode);

    await emulator.runCommand("transposeChars");

    // Transpose happens at active position (5)
    // Character at index 4 ('e') swaps with character at index 5 ('f')
    assertTextEqual(activeTextEditor, "abcdfegh");

    // Cursor moved forward by 1
    assertCursorsEqual(activeTextEditor, [0, 6]);
  });

  test("Transpose on empty line: move last char of previous line to current line", async () => {
    const multiLineText = `abc\n\ndef`;
    activeTextEditor = await setupWorkspace(multiLineText);
    emulator = createEmulator(activeTextEditor);

    // Place cursor on empty line
    setEmptyCursors(activeTextEditor, [1, 0]);

    await emulator.runCommand("transposeChars");

    // Last character 'c' of previous line moves to current (empty) line
    assertTextEqual(activeTextEditor, "ab\nc\ndef");
    // Cursor moves to position 1 (after the moved character)
    assertCursorsEqual(activeTextEditor, [1, 1]);
  });

  test("Transpose with multi-line document", async () => {
    const multiLineText = `abc\ndef\nghi`;
    activeTextEditor = await setupWorkspace(multiLineText);
    emulator = createEmulator(activeTextEditor);

    // Place cursor on second line at position 2 (between 'e' and 'f')
    setEmptyCursors(activeTextEditor, [1, 2]);

    await emulator.runCommand("transposeChars");

    // Swaps 'e' and 'f'
    assertTextEqual(activeTextEditor, "abc\ndfe\nghi");
    assertCursorsEqual(activeTextEditor, [1, 3]);
  });

  test("Transpose at end of line in multi-line document", async () => {
    const multiLineText = `abc\ndef\nghi`;
    activeTextEditor = await setupWorkspace(multiLineText);
    emulator = createEmulator(activeTextEditor);

    // Place cursor at end of first line
    setEmptyCursors(activeTextEditor, [0, 3]);

    await emulator.runCommand("transposeChars");

    // Transposes last two characters of first line
    assertTextEqual(activeTextEditor, "acb\ndef\nghi");
    assertCursorsEqual(activeTextEditor, [0, 3]);
  });

  test("Transpose at beginning of non-first line: move first char to end of previous line, cursor stays", async () => {
    const multiLineText = `abc\ndef\nghi`;
    activeTextEditor = await setupWorkspace(multiLineText);
    emulator = createEmulator(activeTextEditor);

    // Place cursor at beginning of second line
    setEmptyCursors(activeTextEditor, [1, 0]);

    await emulator.runCommand("transposeChars");

    // Transposes EOL with first char of second line ('d'), moving 'd' to end of first line
    assertTextEqual(activeTextEditor, "abcd\nef\nghi");
    // Cursor stays at position 0 on second line
    assertCursorsEqual(activeTextEditor, [1, 0]);
  });

  test("Transpose at beginning of non-first line with empty previous line: move first char to previous line, cursor stays", async () => {
    const multiLineText = `abc\n\ndef`;
    activeTextEditor = await setupWorkspace(multiLineText);
    emulator = createEmulator(activeTextEditor);

    // Place cursor at beginning of third line (after empty line)
    setEmptyCursors(activeTextEditor, [2, 0]);

    await emulator.runCommand("transposeChars");

    // First character 'd' moves to the empty previous line
    assertTextEqual(activeTextEditor, "abc\nd\nef");
    // Cursor stays at position 0
    assertCursorsEqual(activeTextEditor, [2, 0]);
  });

  test("Transpose on empty non-first line: move last char of previous line to current line", async () => {
    const multiLineText = `abc\n\ndef`;
    activeTextEditor = await setupWorkspace(multiLineText);
    emulator = createEmulator(activeTextEditor);

    // Place cursor at beginning of empty line
    setEmptyCursors(activeTextEditor, [1, 0]);

    await emulator.runCommand("transposeChars");

    // Last character 'c' of previous line moves to current (empty) line
    assertTextEqual(activeTextEditor, "ab\nc\ndef");
    // Cursor moves to position 1 (after the moved character)
    assertCursorsEqual(activeTextEditor, [1, 1]);
  });
});
