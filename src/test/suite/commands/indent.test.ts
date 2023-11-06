import * as vscode from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertTextEqual, cleanUpWorkspace, setEmptyCursors, assertCursorsEqual, setupWorkspace } from "../utils";

suite("DeleteIndentation", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  const initialText = "0123456789\nabcdefghij\nABCDEFGHIJ";

  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText, { language: "javascript" });
    activeTextEditor.options.tabSize = 2;
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("merge the current line with the previous line", async () => {
    setEmptyCursors(activeTextEditor, [1, 2]);
    await emulator.runCommand("deleteIndentation");
    assertTextEqual(activeTextEditor, "0123456789 abcdefghij\nABCDEFGHIJ");
    assertCursorsEqual(activeTextEditor, [0, 10]);
  });
});
