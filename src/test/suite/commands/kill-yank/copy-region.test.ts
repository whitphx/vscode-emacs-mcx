import { Position, Selection, TextEditor } from "vscode";
import { EmacsEmulator } from "../../../../emulator";
import { KillRing } from "../../../../kill-yank/kill-ring";
import { assertTextEqual, assertSelectionsEqual, clearTextEditor, setupWorkspace, cleanUpWorkspace } from "../../utils";

[true, false].forEach((withKillRing) => {
  suite(`copyRegion, ${withKillRing ? "with" : "without"} killRing`, () => {
    let activeTextEditor: TextEditor;
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

    test("mark-mode is disabled and selections are unset after copy region", async () => {
      activeTextEditor.selections = [new Selection(new Position(0, 0), new Position(0, 5))];

      await emulator.runCommand("copyRegion");

      // Selection is unset
      assertSelectionsEqual(activeTextEditor, new Selection(0, 5, 0, 5));

      // mark-mode is disabled
      await emulator.runCommand("forwardChar");
      assertSelectionsEqual(activeTextEditor, new Selection(0, 6, 0, 6)); // Selection is empty

      await clearTextEditor(activeTextEditor);

      await emulator.runCommand("yank");
      assertTextEqual(activeTextEditor, "01234");
    });

    test("mark-mode is disabled and selections are unset after copy region with multi cursor", async () => {
      activeTextEditor.selections = [
        new Selection(new Position(0, 0), new Position(0, 5)),
        new Selection(new Position(1, 0), new Position(1, 5)),
        new Selection(new Position(2, 0), new Position(2, 5)),
      ];

      await emulator.runCommand("copyRegion");

      // Selections are unset
      assertSelectionsEqual(
        activeTextEditor,
        new Selection(0, 5, 0, 5),
        new Selection(1, 5, 1, 5),
        new Selection(2, 5, 2, 5),
      );

      // mark-mode is disabled
      await emulator.runCommand("forwardChar");
      assertSelectionsEqual(
        activeTextEditor,
        new Selection(0, 6, 0, 6), // Selections are empty
        new Selection(1, 6, 1, 6),
        new Selection(2, 6, 2, 6),
      );

      await clearTextEditor(activeTextEditor);

      await emulator.runCommand("yank");
      assertTextEqual(activeTextEditor, "01234\nabcde\nABCDE");
    });
  });
});
