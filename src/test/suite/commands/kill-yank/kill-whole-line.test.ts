import assert from "assert";
import * as vscode from "vscode";
import { Position, Selection } from "vscode";
import { EmacsEmulator } from "../../../../emulator";
import { KillRing } from "../../../../kill-yank/kill-ring";
import { assertTextEqual, cleanUpWorkspace, clearTextEditor, setupWorkspace, setEmptyCursors } from "../../utils";

[true, false].forEach((withKillRing) => {
  suite(`Emulator.killWholeLine, ${withKillRing ? "with" : "without"} killRing`, () => {
    let activeTextEditor: vscode.TextEditor;
    let emulator: EmacsEmulator;

    setup(async () => {
      const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
      activeTextEditor = await setupWorkspace(initialText);

      emulator = withKillRing
        ? new EmacsEmulator(activeTextEditor, new KillRing())
        : new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    [0, 5, 10].forEach((cursorCharNum) => {
      // beginning, middle, end
      test(`single cursor in the middle line of the document, at (1, ${cursorCharNum})`, async () => {
        const cursorLineNum = 1; // the middle line
        setEmptyCursors(activeTextEditor, [cursorLineNum, cursorCharNum]);

        await emulator.runCommand("killWholeLine");

        assertTextEqual(
          activeTextEditor,
          `0123456789
ABCDEFGHIJ`,
        );

        // Check the cut text
        await clearTextEditor(activeTextEditor);
        activeTextEditor.selections = [new Selection(new Position(0, 0), new Position(0, 0))];
        await emulator.runCommand("yank");
        assert.strictEqual(activeTextEditor.document.getText(), "abcdefghij\n");
      });
    });

    [0, 5, 10].forEach((cursorCharNum) => {
      // beginning, middle, end
      test(`single cursor in the last line of the document, at (2, ${cursorCharNum})`, async () => {
        const cursorLineNum = 2; // the last line
        setEmptyCursors(activeTextEditor, [cursorLineNum, cursorCharNum]);

        await emulator.runCommand("killWholeLine");

        assertTextEqual(
          activeTextEditor,
          `0123456789
abcdefghij
`,
        );

        // Check the cut text
        await clearTextEditor(activeTextEditor);
        activeTextEditor.selections = [new Selection(new Position(0, 0), new Position(0, 0))];
        await emulator.runCommand("yank");
        assert.strictEqual(activeTextEditor.document.getText(), "ABCDEFGHIJ");
      });
    });

    (["mark-mode", "rectangle-mode"] as const).forEach((mode) => {
      test(`${mode} doesn't affect the behavior`, async () => {
        setEmptyCursors(activeTextEditor, [0, 0]);
        if (mode === "mark-mode") {
          emulator.setMarkCommand();
        } else if (mode === "rectangle-mode") {
          emulator.rectangleMarkMode();
        }
        await emulator.runCommand("nextLine");
        await emulator.runCommand("forwardChar");
        // Now the cursor is at [1, 1]

        await emulator.runCommand("killWholeLine");
        assertTextEqual(
          activeTextEditor,
          `0123456789
ABCDEFGHIJ`,
        );
      });
    });
  });
});
