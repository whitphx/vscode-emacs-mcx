import assert from "assert";
import * as vscode from "vscode";
import { Position, Selection } from "vscode";
import { EmacsEmulator } from "../../emulator";
import { cleanUpWorkspace, clearTextEditor, setupWorkspace } from "./utils";

suite("Emulator with text editing", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  suite("killRegion with yank", () => {
    test("it sorts ranges and aggregates the selected texts in order when multi cursor mode", async () => {
      // Select with multi cursor in not aligned order
      activeTextEditor.selections = [
        new Selection(new Position(1, 0), new Position(1, 3)),
        new Selection(new Position(0, 0), new Position(0, 3)),
        new Selection(new Position(2, 0), new Position(2, 3)),
      ];
      await emulator.runCommand("killRegion");

      assert.strictEqual(
        activeTextEditor.document.getText(),
        `3456789
defghij
DEFGHIJ`,
      );

      await clearTextEditor(activeTextEditor);

      activeTextEditor.selections = [new Selection(new Position(0, 0), new Position(0, 0))];
      await emulator.runCommand("yank");

      assert.strictEqual(
        activeTextEditor.document.getText(),
        `012
abc
ABC`,
      );
    });
  });
});
