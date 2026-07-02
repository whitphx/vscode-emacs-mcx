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

/* cSpell:disable */

suite("transpose-words", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = `a b c d e`;
    activeTextEditor = await setupWorkspace(initialText);
    emulator = createEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("Cursor before a word", async () => {
    // Place cursor between ' ' and 'b'.
    setEmptyCursors(activeTextEditor, [0, 2]);
    await emulator.runCommand("transposeWords");

    assertTextEqual(activeTextEditor, "b a c d e");
    assertCursorsEqual(activeTextEditor, [0, 3]);
  });

  test("Cursor after a word", async () => {
    // Place cursor between 'a' and ' '.
    setEmptyCursors(activeTextEditor, [0, 1]);
    await emulator.runCommand("transposeWords");

    assertTextEqual(activeTextEditor, "b a c d e");
    assertCursorsEqual(activeTextEditor, [0, 3]);
  });
  test("Transposing last two words fails", async () => {
    // Place cursor at end of line.
    setEmptyCursors(activeTextEditor, [0, 9]);
    await emulator.runCommand("transposeWords");
    // This will be an error and leaves the document unchanged.
    assertTextEqual(activeTextEditor, "a b c d e");
    assertCursorsEqual(activeTextEditor, [0, 8]);
  });

  test("Transpose at beginning of document", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("transposeWords");
    assertTextEqual(activeTextEditor, "b a c d e");
    assertCursorsEqual(activeTextEditor, [0, 3]);
  });

  test("Sequential transpose moves words forward", async () => {
    // Start at between ' ' and 'b'
    setEmptyCursors(activeTextEditor, [0, 2]);
    await emulator.runCommand("transposeWords");
    assertTextEqual(activeTextEditor, "b a c d e");
    assertCursorsEqual(activeTextEditor, [0, 3]);

    await emulator.runCommand("transposeWords");
    assertTextEqual(activeTextEditor, "b c a d e");
    assertCursorsEqual(activeTextEditor, [0, 5]);
  });

  test("Transpose with prefix argument 2: move cursor by 2 words", async () => {
    // Start at between ' ' and 'b'
    setEmptyCursors(activeTextEditor, [0, 2]);

    await emulator.digitArgument(2);
    await emulator.runCommand("transposeWords");

    assertTextEqual(activeTextEditor, "b c a d e");
    assertCursorsEqual(activeTextEditor, [0, 5]);
  });

  test("Transpose with prefix argument 3: move cursor by 3 words", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]);

    await emulator.digitArgument(3);
    await emulator.runCommand("transposeWords");

    assertTextEqual(activeTextEditor, "b c d a e");
    assertCursorsEqual(activeTextEditor, [0, 7]);
  });
  test("Transpose with negative prefix argument (-1): move cursor backward by 1 word", async () => {
    // Start at between ' ' and 'c'.
    setEmptyCursors(activeTextEditor, [0, 4]);

    await emulator.negativeArgument();
    await emulator.runCommand("transposeWords");

    assertTextEqual(activeTextEditor, "b a c d e");
    assertCursorsEqual(activeTextEditor, [0, 1]);
  });

  test("Transpose with negative prefix argument (-2): move char before point backward by 2", async () => {
    // Start at between ' ' and 'd'.
    setEmptyCursors(activeTextEditor, [0, 6]);

    await emulator.negativeArgument();
    await emulator.subsequentArgumentDigit(2);
    await emulator.runCommand("transposeWords");

    assertTextEqual(activeTextEditor, "c a b d e");
    assertCursorsEqual(activeTextEditor, [0, 1]);
  });

  test("Transpose at beginning with negative prefix does nothing", async () => {
    // Start at beginning
    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.negativeArgument();
    await emulator.runCommand("transposeWords");

    // No change
    assertTextEqual(activeTextEditor, "a b c d e");
    assertCursorsEqual(activeTextEditor, [0, 1]);
  });

  test("Transpose with line too short (less than 2 characters)", async () => {
    const shortText = `a`;
    activeTextEditor = await setupWorkspace(shortText);
    emulator = createEmulator(activeTextEditor);

    setEmptyCursors(activeTextEditor, [0, 1]);

    await emulator.runCommand("transposeWords");

    // No change on the text
    assertTextEqual(activeTextEditor, "a");
    // Cursor moves to the beginning
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });

  test("Transpose with prefix argument beyond line end: cursor moves to end", async () => {
    // Start between ' ' and 'b'.
    setEmptyCursors(activeTextEditor, [0, 2]);

    // Try to transpose with offset 5 (beyond line end)
    await emulator.digitArgument(5);
    await emulator.runCommand("transposeWords");

    // An error happens
    assertTextEqual(activeTextEditor, "a b c d e");
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });

  test("Transpose with mark mode active", async () => {
    // Start between ' ' and 'b'.
    setEmptyCursors(activeTextEditor, [0, 2]);

    // Enter mark mode and create selection
    emulator.enterMarkMode();
    await emulator.runCommand("forwardWord");
    await emulator.runCommand("forwardWord");

    // Verify mark mode is active
    assert.ok(emulator.isInMarkMode);

    await emulator.runCommand("transposeWords");

    assertTextEqual(activeTextEditor, "a b d c e");
    assertCursorsEqual(activeTextEditor, [0, 7]);
  });

  test("Transpose words across lines", async () => {
    const multiLineText = `a b\nd e`;
    activeTextEditor = await setupWorkspace(multiLineText);
    emulator = createEmulator(activeTextEditor);

    // Place cursor on the empty line
    setEmptyCursors(activeTextEditor, [1, 0]);

    await emulator.runCommand("transposeWords");

    assertTextEqual(activeTextEditor, "a d\nb e");
    assertCursorsEqual(activeTextEditor, [1, 1]);
  });

  test("Transpose with multi-line document", async () => {
    const multiLineText = `a b\nc d\ne f`;
    activeTextEditor = await setupWorkspace(multiLineText);
    emulator = createEmulator(activeTextEditor);

    setEmptyCursors(activeTextEditor, [1, 2]);

    await emulator.runCommand("transposeWords");

    // Swaps 'e' and 'f'
    assertTextEqual(activeTextEditor, "a b\nd c\ne f");
    assertCursorsEqual(activeTextEditor, [1, 3]);
  });

  test("Transpose at end of line in multi-line document", async () => {
    const multiLineText = `a b\nc d\ne f`;
    activeTextEditor = await setupWorkspace(multiLineText);
    emulator = createEmulator(activeTextEditor);

    setEmptyCursors(activeTextEditor, [0, 3]);

    await emulator.runCommand("transposeWords");

    assertTextEqual(activeTextEditor, "a c\nb d\ne f");
    assertCursorsEqual(activeTextEditor, [1, 1]);
  });

  test("Transpose at beginning of non-first line: move first word to end of previous line, cursor moves one", async () => {
    const multiLineText = `a b\nc d\ne f`;
    activeTextEditor = await setupWorkspace(multiLineText);
    emulator = createEmulator(activeTextEditor);

    setEmptyCursors(activeTextEditor, [1, 0]);

    await emulator.runCommand("transposeWords");

    assertTextEqual(activeTextEditor, "a c\nb d\ne f");
    assertCursorsEqual(activeTextEditor, [1, 1]);
  });

  test("Transpose at beginning of non-first line", async () => {
    const multiLineText = `a b\nc d`;
    activeTextEditor = await setupWorkspace(multiLineText);
    emulator = createEmulator(activeTextEditor);

    setEmptyCursors(activeTextEditor, [1, 0]);

    await emulator.runCommand("transposeWords");

    // First character 'd' moves to the empty previous line
    assertTextEqual(activeTextEditor, "a c\nb d");
    assertCursorsEqual(activeTextEditor, [1, 1]);
  });
});
