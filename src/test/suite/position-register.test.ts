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
import assert from "assert";

suite("Point registers", () => {
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
    await emulator.runCommand("pointToRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [0, 2]);

    // Move cursor and jump back
    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator.runCommand("jumpToRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [0, 2]);
  });

  test("multiple cursors with point-to-register", async () => {
    // Save multiple cursor positions
    setEmptyCursors(activeTextEditor, [0, 2], [1, 3]);
    await emulator.runCommand("pointToRegister");
    await emulator.runCommand("registerNameCommand", ["b"]);
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [0, 2], [1, 3]);

    // Move cursors and jump back
    setEmptyCursors(activeTextEditor, [2, 5]);
    await emulator.runCommand("jumpToRegister");
    await emulator.runCommand("registerNameCommand", ["b"]);
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [0, 2], [1, 3]);
  });

  test("point-to-register doesn't interrupt mark mode and saves only the active positions", async () => {
    // Save position
    setEmptyCursors(activeTextEditor, [0, 2]);
    emulator.setMarkCommand();
    await emulator.runCommand("nextLine");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("pointToRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assert.equal(emulator.isInMarkMode, true);
    assertTextEqual(activeTextEditor, initialText);
    assertSelectionsEqual(activeTextEditor, [0, 2, 1, 3]);

    // Move cursor and jump back
    emulator.exitMarkMode();
    setEmptyCursors(activeTextEditor, [2, 5]);
    await emulator.runCommand("jumpToRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [1, 3]);
  });

  test("point-to-register can switch the buffer (document)", async () => {
    // Save position
    setEmptyCursors(activeTextEditor, [0, 2]);
    await emulator.runCommand("pointToRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [0, 2]);

    // Open another document
    const doc = await vscode.workspace.openTextDocument({
      content: "another document",
    });
    await vscode.window.showTextDocument(doc);

    // Move cursor and jump back
    await emulator.runCommand("jumpToRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(vscode.window.activeTextEditor!, initialText);
    assertCursorsEqual(vscode.window.activeTextEditor!, [0, 2]);
  });

  test("jump to non-existent register", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("jumpToRegister");
    await emulator.runCommand("registerNameCommand", ["z"]);
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });
});
