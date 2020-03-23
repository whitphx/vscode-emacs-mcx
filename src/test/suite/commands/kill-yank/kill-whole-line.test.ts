import * as assert from "assert";
import * as vscode from "vscode";
import { Position, Selection } from "vscode";
import { EmacsEmulator } from "../../../../emulator";
import { assertTextEqual, cleanUpWorkspace, clearTextEditor, setupWorkspace } from "../../utils";

suite("Emulator.killWholeLine", () => {
  let activeTextEditor: vscode.TextEditor;

  suite("with non-empty initial text", () => {
    setup(async () => {
      const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
      activeTextEditor = await setupWorkspace(initialText);
    });

    teardown(cleanUpWorkspace);

    suite("single cursor in the middle line of the document", () => {
      const cursorLineNum = 1;
      const cursorCharNums = [0, 5, 10]; // beginning, middle, end
      cursorCharNums.forEach((cursorCharNum) => {
        test(`it works with single cursor at (${cursorLineNum}, ${cursorCharNum})`, async () => {
          const emulator = new EmacsEmulator(activeTextEditor);

          activeTextEditor.selections = [
            new Selection(new Position(cursorLineNum, cursorCharNum), new Position(cursorLineNum, cursorCharNum)),
          ];

          await emulator.runCommand("killWholeLine");

          assertTextEqual(
            activeTextEditor,
            `0123456789
ABCDEFGHIJ`
          );

          // Check the cut text
          clearTextEditor(activeTextEditor);
          activeTextEditor.selections = [new Selection(new Position(0, 0), new Position(0, 0))];
          await emulator.runCommand("yank");
          assert.equal(activeTextEditor.document.getText(), "abcdefghij\n");
        });
      });
    });

    suite("single cursor in the last line of the document", () => {
      const cursorLineNum = 2; // the last line
      const cursorCharNums = [0, 5, 10]; // beginning, middle, end
      cursorCharNums.forEach((cursorCharNum) => {
        test(`it works with single cursor at (${cursorLineNum}, ${cursorCharNum})`, async () => {
          const emulator = new EmacsEmulator(activeTextEditor);

          activeTextEditor.selections = [
            new Selection(new Position(cursorLineNum, cursorCharNum), new Position(cursorLineNum, cursorCharNum)),
          ];

          await emulator.runCommand("killWholeLine");

          assertTextEqual(
            activeTextEditor,
            `0123456789
abcdefghij
`
          );

          // Check the cut text
          clearTextEditor(activeTextEditor);
          activeTextEditor.selections = [new Selection(new Position(0, 0), new Position(0, 0))];
          await emulator.runCommand("yank");
          assert.equal(activeTextEditor.document.getText(), "ABCDEFGHIJ");
        });
      });
    });
  });
});
