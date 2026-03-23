import * as vscode from "vscode";
import { EmacsEmulator } from "../../../emulator";
import {
  assertTextEqual,
  cleanUpWorkspace,
  setEmptyCursors,
  assertCursorsEqual,
  setupWorkspace,
  createEmulator,
} from "../utils";

suite("cycle-spacing", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  teardown(cleanUpWorkspace);

  suite("cycling through phases", () => {
    const initialText = "a   b   c";

    setup(async () => {
      activeTextEditor = await setupWorkspace(initialText);
      emulator = createEmulator(activeTextEditor);
    });

    test("first call acts like just-one-space", async () => {
      setEmptyCursors(activeTextEditor, [0, 2]);
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "a b   c");
      assertCursorsEqual(activeTextEditor, [0, 2]);
    });

    test("second call acts like delete-horizontal-space", async () => {
      setEmptyCursors(activeTextEditor, [0, 2]);
      await emulator.runCommand("cycleSpacing");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "ab   c");
      assertCursorsEqual(activeTextEditor, [0, 1]);
    });

    test("third call restores original whitespace", async () => {
      setEmptyCursors(activeTextEditor, [0, 2]);
      await emulator.runCommand("cycleSpacing");
      await emulator.runCommand("cycleSpacing");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, initialText);
    });

    test("fourth call starts the cycle again (just-one-space)", async () => {
      setEmptyCursors(activeTextEditor, [0, 2]);
      await emulator.runCommand("cycleSpacing");
      await emulator.runCommand("cycleSpacing");
      await emulator.runCommand("cycleSpacing");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "a b   c");
      assertCursorsEqual(activeTextEditor, [0, 2]);
    });
  });

  suite("with prefix argument", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("a   b   c");
      emulator = createEmulator(activeTextEditor);
    });

    test("forwards prefix argument to just-one-space (phase 0)", async () => {
      setEmptyCursors(activeTextEditor, [0, 2]);
      await emulator.universalArgument(); // C-u sets prefix to 4
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "a    b   c");
      assertCursorsEqual(activeTextEditor, [0, 5]);
    });
  });

  suite("when phase produces no edit", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("a b");
      emulator = createEmulator(activeTextEditor);
    });

    test("restore works correctly when phase 0 is a no-op", async () => {
      // Cursor at [0,1] in "a b": already one space, so just-one-space
      // replaces " " with " " (document still changes).
      // Phase 1 (delete-horizontal-space) deletes that space.
      // Phase 2 (restore) should undo back to "a b".
      setEmptyCursors(activeTextEditor, [0, 1]);
      await emulator.runCommand("cycleSpacing");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "ab");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "a b");
    });
  });

  suite("cycle resets on interruption", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("a   b   c");
      emulator = createEmulator(activeTextEditor);
    });

    test("resets cycle when another command runs between calls", async () => {
      setEmptyCursors(activeTextEditor, [0, 2]);
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "a b   c");

      // Run a different command to interrupt the cycle
      await emulator.runCommand("forwardChar");

      // Next cycle-spacing should start from phase 0 again
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "a b c");
      assertCursorsEqual(activeTextEditor, [0, 4]);
    });
  });
});
