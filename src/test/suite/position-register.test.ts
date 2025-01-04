import * as vscode from "vscode";
import { EmacsEmulator } from "../../emulator";

import {
  assertTextEqual,
  cleanUpWorkspace,
  assertCursorsEqual,
  setupWorkspace,
  setEmptyCursors,
  assertSelectionsEqual,
} from "./utils";

suite("Position registers", () => {
  const initialText = "0123456789\nabcdefghij\nABCDEFGHIJ";

  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;
  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText, { language: "javascript" });
    activeTextEditor.options.tabSize = 2;
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("point-to-register and jump-to-register", async () => {
    // Save position
    setEmptyCursors(activeTextEditor, [0, 2]);
    await emulator.runCommand("pointToRegister", ["a"]);
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [0, 2]);

    // Move cursor and jump back
    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator.runCommand("jumpToRegister", ["a"]);
    assertTextEqual(activeTextEditor, initialText);
    assertSelectionsEqual(activeTextEditor, [0, 2, 0, 2]);
  });

  test("multiple cursors with point-to-register", async () => {
    // Save multiple cursor positions
    activeTextEditor.selections = [new vscode.Selection(0, 2, 0, 2), new vscode.Selection(1, 3, 1, 3)];
    await emulator.runCommand("pointToRegister", ["b"]);
    assertTextEqual(activeTextEditor, initialText);
    assertSelectionsEqual(activeTextEditor, [0, 2, 0, 2], [1, 3, 1, 3]);

    // Move cursors and jump back
    setEmptyCursors(activeTextEditor, [2, 5]);
    await emulator.runCommand("jumpToRegister", ["b"]);
    assertTextEqual(activeTextEditor, initialText);
    assertSelectionsEqual(activeTextEditor, [0, 2, 0, 2], [1, 3, 1, 3]);
  });

  test("jump to non-existent register", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("jumpToRegister", ["z"]);
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });

  test("jump sets mark", async () => {
    // Save position
    setEmptyCursors(activeTextEditor, [0, 2]);
    await emulator.runCommand("pointToRegister", ["a"]);

    // Move cursor and jump back
    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator.runCommand("jumpToRegister", ["a"]);

    // Verify mark was set at the previous position
    await emulator.runCommand("exchangePointAndMark");
    assertSelectionsEqual(activeTextEditor, [1, 5, 1, 5]);
  });
});
