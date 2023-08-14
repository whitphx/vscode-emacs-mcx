import assert from "assert";
import { Selection, TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertSelectionsEqual, cleanUpWorkspace, setupWorkspace } from "../utils";

suite("addSelectionTo(Next|Previous)FindMatch", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = `aaa
bbb
ccc
aaa
bbb
ccc`;
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  ["addSelectionToNextFindMatch", "addSelectionToPreviousFindMatch"].forEach((commandName) => {
    test(`mark-mode is enabled when ${commandName} is invoked`, async () => {
      // First, select the first 'aaa'
      activeTextEditor.selections = [new Selection(0, 0, 0, 3)];

      // execute command
      await emulator.runCommand(commandName);

      // Then, next 'aaa' is selected
      assertSelectionsEqual(
        activeTextEditor,
        new Selection(0, 0, 0, 3), // The first 'aaa' appearance
        new Selection(3, 0, 3, 3), // The second one.
      );

      // And mark-mode is still valid
      await emulator.runCommand("backwardChar");
      assert.ok(activeTextEditor.selections.every((selection) => !selection.isEmpty));
    });
  });
});
