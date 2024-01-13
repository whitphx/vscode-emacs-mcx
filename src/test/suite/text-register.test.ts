import * as vscode from "vscode";
import { EmacsEmulator } from "../../emulator";
import { assertTextEqual, clearTextEditor, cleanUpWorkspace, assertCursorsEqual, setupWorkspace } from "./utils";

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
    activeTextEditor.selections = [new vscode.Selection(0, 0, 1, 2)];
    await emulator.runCommand("copyToRegister", ["a"]);

    // Empty string
    activeTextEditor.selections = [new vscode.Selection(0, 0, 0, 0)];
    await emulator.runCommand("copyToRegister", ["b"]);

    await clearTextEditor(activeTextEditor);

    await emulator.runCommand("insertRegister", ["c"]);
    assertTextEqual(activeTextEditor, "");
    assertCursorsEqual(activeTextEditor, [0, 0]);

    await emulator.runCommand("insertRegister", ["b"]);
    assertTextEqual(activeTextEditor, "");
    assertCursorsEqual(activeTextEditor, [0, 0]);

    await emulator.runCommand("insertRegister", ["a"]);
    assertTextEqual(activeTextEditor, "0123456789\nab");
    assertCursorsEqual(activeTextEditor, [1, 2]);
  });
});
