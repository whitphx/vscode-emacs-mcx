import * as vscode from "vscode";
import assert from "assert";
import { EmacsEmulator } from "../../emulator";
import {
  assertTextEqual,
  clearTextEditor,
  cleanUpWorkspace,
  assertCursorsEqual,
  setupWorkspace,
  setEmptyCursors,
  assertSelectionsEqual,
} from "./utils";

suite("Text registers", () => {
  const initialText = "0123456789\nabcdefghij\nABCDEFGHIJ";

  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText, { language: "javascript" });
    activeTextEditor.options.tabSize = 2;
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("copy and paste", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]);
    emulator.setMarkCommand();
    await emulator.runCommand("nextLine");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    assertSelectionsEqual(activeTextEditor, [0, 2, 1, 4]);
    await emulator.runCommand("copyToRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(activeTextEditor, "0123456789\nabcdefghij\nABCDEFGHIJ");
    assertCursorsEqual(activeTextEditor, [1, 4]);
    assert.equal(emulator.isInMarkMode, false);

    // Empty string
    setEmptyCursors(activeTextEditor, [0, 2]);
    emulator.setMarkCommand();
    await emulator.runCommand("copyToRegister");
    await emulator.runCommand("registerNameCommand", ["b"]);
    assertTextEqual(activeTextEditor, "0123456789\nabcdefghij\nABCDEFGHIJ");
    assertCursorsEqual(activeTextEditor, [0, 2]);
    assert.equal(emulator.isInMarkMode, false);

    await clearTextEditor(activeTextEditor);

    await emulator.runCommand("insertRegister");
    await emulator.runCommand("registerNameCommand", ["c"]);
    assertTextEqual(activeTextEditor, "");
    assertCursorsEqual(activeTextEditor, [0, 0]);

    await emulator.runCommand("insertRegister");
    await emulator.runCommand("registerNameCommand", ["b"]);
    assertTextEqual(activeTextEditor, "");
    assertCursorsEqual(activeTextEditor, [0, 0]);

    await emulator.runCommand("insertRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(activeTextEditor, "23456789\nabcd");
    assertCursorsEqual(activeTextEditor, [1, 4]);
  });

  test("copy with prefix argument that deletes region", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]);
    emulator.setMarkCommand();
    await emulator.runCommand("nextLine");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    assertSelectionsEqual(activeTextEditor, [0, 2, 1, 4]);
    await emulator.universalArgument(); // C-u
    await emulator.runCommand("copyToRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(activeTextEditor, "01efghij\nABCDEFGHIJ");
    assertCursorsEqual(activeTextEditor, [0, 2]);
    assert.equal(emulator.isInMarkMode, false);

    // Empty string
    setEmptyCursors(activeTextEditor, [0, 2]);
    emulator.setMarkCommand();
    await emulator.universalArgument(); // C-u
    await emulator.runCommand("copyToRegister");
    await emulator.runCommand("registerNameCommand", ["b"]);
    assertTextEqual(activeTextEditor, "01efghij\nABCDEFGHIJ");
    assertCursorsEqual(activeTextEditor, [0, 2]);
    assert.equal(emulator.isInMarkMode, false);

    // Insert
    setEmptyCursors(activeTextEditor, [0, 2]);
    await emulator.runCommand("insertRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(activeTextEditor, "0123456789\nabcdefghij\nABCDEFGHIJ");

    // Insert empty string
    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("insertRegister");
    await emulator.runCommand("registerNameCommand", ["b"]);
    assertTextEqual(activeTextEditor, "0123456789\nabcdefghij\nABCDEFGHIJ");
  });

  test("copy and paste rectangle", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]);
    emulator.setMarkCommand();
    await emulator.runCommand("nextLine");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    assertSelectionsEqual(activeTextEditor, [0, 2, 1, 4]);
    await emulator.runCommand("copyRectangleToRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(activeTextEditor, "0123456789\nabcdefghij\nABCDEFGHIJ");
    assertCursorsEqual(activeTextEditor, [1, 4]);
    assert.equal(emulator.isInMarkMode, false);

    // Empty string
    setEmptyCursors(activeTextEditor, [0, 2]);
    await emulator.runCommand("copyRectangleToRegister");
    await emulator.runCommand("registerNameCommand", ["b"]);
    assertTextEqual(activeTextEditor, "0123456789\nabcdefghij\nABCDEFGHIJ");
    assertCursorsEqual(activeTextEditor, [0, 2]);
    assert.equal(emulator.isInMarkMode, false);

    await clearTextEditor(activeTextEditor);

    await emulator.runCommand("insertRegister");
    await emulator.runCommand("registerNameCommand", ["c"]);
    assertTextEqual(activeTextEditor, "");
    assertCursorsEqual(activeTextEditor, [0, 0]);

    await emulator.runCommand("insertRegister");
    await emulator.runCommand("registerNameCommand", ["b"]);
    assertTextEqual(activeTextEditor, "");

    // Insert rectangle
    await emulator.runCommand("insertRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(activeTextEditor, "23\ncd");

    // Insert rectangle in an indented line
    setEmptyCursors(activeTextEditor, [1, 2]);
    await emulator.runCommand("insertRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(activeTextEditor, "23\ncd23\n  cd");
  });

  test("copy rectangle with prefix argument that deletes region", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]);
    emulator.setMarkCommand();
    await emulator.runCommand("nextLine");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    assertSelectionsEqual(activeTextEditor, [0, 2, 1, 4]);
    await emulator.universalArgument(); // C-u
    await emulator.runCommand("copyRectangleToRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(activeTextEditor, "01456789\nabefghij\nABCDEFGHIJ");
    assertCursorsEqual(activeTextEditor, [1, 2]); // Cursor is kept in the same line
    assert.equal(emulator.isInMarkMode, false);

    // Empty string
    setEmptyCursors(activeTextEditor, [0, 2]);
    await emulator.universalArgument(); // C-u
    await emulator.runCommand("copyRectangleToRegister");
    await emulator.runCommand("registerNameCommand", ["b"]);
    assertTextEqual(activeTextEditor, "01456789\nabefghij\nABCDEFGHIJ");
    assertCursorsEqual(activeTextEditor, [0, 2]);
    assert.equal(emulator.isInMarkMode, false);

    await clearTextEditor(activeTextEditor);

    await emulator.runCommand("insertRegister");
    await emulator.runCommand("registerNameCommand", ["c"]);
    assertTextEqual(activeTextEditor, "");
    assertCursorsEqual(activeTextEditor, [0, 0]);

    await emulator.runCommand("insertRegister");
    await emulator.runCommand("registerNameCommand", ["b"]);
    assertTextEqual(activeTextEditor, "");

    // Insert rectangle
    await emulator.runCommand("insertRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(activeTextEditor, "23\ncd");

    // Insert rectangle in an indented line
    setEmptyCursors(activeTextEditor, [1, 2]);
    await emulator.runCommand("insertRegister");
    await emulator.runCommand("registerNameCommand", ["a"]);
    assertTextEqual(activeTextEditor, "23\ncd23\n  cd");
  });
});
