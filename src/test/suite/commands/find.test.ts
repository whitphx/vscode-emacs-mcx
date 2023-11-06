import * as vscode from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertCursorsEqual, setEmptyCursors, setupWorkspace, cleanUpWorkspace, assertSelectionsEqual } from "../utils";

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

    await emulator.runCommand("isearchForward", [{ searchString: "aaa" }]);

    assertSelectionsEqual(activeTextEditor, [2, 0, 2, 3]);

    await emulator.runCommand("isearchAbort");

    assertCursorsEqual(activeTextEditor, [1, 1]);
  });

  test("isearchExit sets a new mark at where the search started", async () => {
    setEmptyCursors(activeTextEditor, [1, 1]);

    await emulator.runCommand("isearchForward", [{ searchString: "aaa" }]);

    assertSelectionsEqual(activeTextEditor, [2, 0, 2, 3]);

    await emulator.runCommand("isearchExit");

    // This is different from the original Emacs behavior which doesn't select the matched text after exiting isearch.
    // But I think this is more useful respecting the VSCode's behavior.
    assertSelectionsEqual(activeTextEditor, [2, 0, 2, 3]);

    emulator.popMark();

    assertCursorsEqual(activeTextEditor, [1, 1]);
  });
});
