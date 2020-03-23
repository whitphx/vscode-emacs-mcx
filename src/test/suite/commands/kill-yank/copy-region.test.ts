import * as assert from "assert";
import { Position, Range, Selection, TextEditor } from "vscode";
import { EmacsEmulator } from "../../../../emulator";
import { assertTextEqual, clearTextEditor, setupWorkspace } from "../../utils";

suite("copyRegion", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  test("mark-mode is disabled and selections are unset after copy region", async () => {
    activeTextEditor.selections = [new Selection(new Position(0, 0), new Position(0, 5))];

    await emulator.runCommand("copyRegion");

    // Selection is unset
    assert.equal(activeTextEditor.selections.length, 1);
    assert.ok(activeTextEditor.selections[0].isEqual(new Range(new Position(0, 5), new Position(0, 5))));

    // mark-mode is disabled
    await emulator.runCommand("forwardChar");
    assert.equal(activeTextEditor.selections.length, 1);
    assert.ok(activeTextEditor.selections[0].isEqual(new Range(new Position(0, 6), new Position(0, 6)))); // Selection is empty

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
    assert.equal(activeTextEditor.selections.length, 3);
    assert.ok(activeTextEditor.selections[0].isEqual(new Range(new Position(0, 5), new Position(0, 5))));
    assert.ok(activeTextEditor.selections[1].isEqual(new Range(new Position(1, 5), new Position(1, 5))));
    assert.ok(activeTextEditor.selections[2].isEqual(new Range(new Position(2, 5), new Position(2, 5))));

    // mark-mode is disabled
    await emulator.runCommand("forwardChar");
    assert.equal(activeTextEditor.selections.length, 3);
    assert.ok(activeTextEditor.selections[0].isEqual(new Range(new Position(0, 6), new Position(0, 6)))); // Selections are empty
    assert.ok(activeTextEditor.selections[1].isEqual(new Range(new Position(1, 6), new Position(1, 6))));
    assert.ok(activeTextEditor.selections[2].isEqual(new Range(new Position(2, 6), new Position(2, 6))));

    await clearTextEditor(activeTextEditor);

    await emulator.runCommand("yank");
    assertTextEqual(activeTextEditor, "01234\nabcde\nABCDE");
  });
});
