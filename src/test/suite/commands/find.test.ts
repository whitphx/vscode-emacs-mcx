import * as vscode from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertCursorsEqual, setEmptyCursors, setupWorkspace, cleanUpWorkspace } from "../utils";

suite("isearch", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "aaa\nxxx\naaa";
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("isearchAbort returns to where the search started", async () => {
    setEmptyCursors(activeTextEditor, [1, 1]);

    await emulator.runCommand("isearchForward");

    setEmptyCursors(activeTextEditor, [2, 0]);

    await emulator.runCommand("isearchAbort");

    assertCursorsEqual(activeTextEditor, [1, 1]);
  });

  test("isearchExit sets a new mark at where the search started", async () => {
    setEmptyCursors(activeTextEditor, [1, 1]);

    await emulator.runCommand("isearchForward");

    setEmptyCursors(activeTextEditor, [2, 0]);

    await emulator.runCommand("isearchExit");

    assertCursorsEqual(activeTextEditor, [2, 0]);

    emulator.popMark();

    assertCursorsEqual(activeTextEditor, [1, 1]);
  });
});
