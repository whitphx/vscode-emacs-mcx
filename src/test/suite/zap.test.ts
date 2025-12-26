import * as vscode from "vscode";
import { EmacsEmulator } from "../../emulator";
import {
  assertTextEqual,
  cleanUpWorkspace,
  assertCursorsEqual,
  setupWorkspace,
  setEmptyCursors,
  createEmulator,
} from "./utils";

suite("ZapCommands", () => {
  const initialText = "abcd\nabcdef\n";

  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText, { language: "javascript" });
    activeTextEditor.options.tabSize = 2;
    emulator = createEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("delete first character", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("zapCharCommand", "a");
    assertTextEqual(activeTextEditor, "bcd\nabcdef\n");
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });

  test("delete middle character in first line", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("zapCharCommand", "c");
    assertTextEqual(activeTextEditor, "d\nabcdef\n");
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });

  test("does nothing when target character does not exist", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("zapCharCommand", "z");
    assertTextEqual(activeTextEditor, "abcd\nabcdef\n");
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });

  test("stopchar before the cursor", async () => {
    setEmptyCursors(activeTextEditor, [0, 1]);
    await emulator.runCommand("zapCharCommand", "a");
    assertTextEqual(activeTextEditor, "abcdef\n");
    assertCursorsEqual(activeTextEditor, [0, 1]);
  });

  test("delete char in second line", async () => {
    setEmptyCursors(activeTextEditor, [1, 0]);
    await emulator.runCommand("zapCharCommand", "b");
    assertTextEqual(activeTextEditor, "abcd\ncdef\n");
    assertCursorsEqual(activeTextEditor, [1, 0]);
  });

  test("includes stopChar when at cursor position", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]);
    await emulator.runCommand("zapCharCommand", "c");
    assertTextEqual(activeTextEditor, "abd\nabcdef\n");
    assertCursorsEqual(activeTextEditor, [0, 2]);
  });
});
