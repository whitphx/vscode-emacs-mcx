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
