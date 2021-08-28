import assert from "assert";
import * as vscode from "vscode";
import { Position, Range, Selection } from "vscode";
import { EmacsEmulator } from "../../emulator";
import { cleanUpWorkspace, setupWorkspace, setEmptyCursors, assertCursorsEqual } from "./utils";

suite("mark-mode", () => {
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

  const edits: Array<[string, () => Thenable<unknown>]> = [
    ["edit", () => activeTextEditor.edit((editBuilder) => editBuilder.insert(new Position(0, 0), "hoge"))],
    [
      "delete",
      () =>
        activeTextEditor.edit((editBuilder) => editBuilder.delete(new Range(new Position(0, 0), new Position(0, 1)))),
    ],
    [
      "replace",
      () =>
        activeTextEditor.edit((editBuilder) =>
          editBuilder.replace(new Range(new Position(0, 0), new Position(0, 1)), "hoge")
        ),
    ],
  ];

  edits.forEach(([label, editOp]) => {
    test(`exit mark-mode when ${label} occurs`, async () => {
      // Enter mark-mode and select some characters
      activeTextEditor.selections = [new Selection(new Position(0, 0), new Position(0, 0))];
      await emulator.setMarkCommand();
      await emulator.runCommand("forwardChar");

      // Edit occurs
      await editOp();

      // assert.ok(activeTextEditor.selections.every((selection) => selection.isEmpty));

      // After edit, mark-mode is no longer active
      await emulator.runCommand("forwardChar");
      assert.ok(activeTextEditor.selections.every((selection) => selection.isEmpty));
    });
  });
});

suite("MarkRing", () => {
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

  [true, false].forEach((deactivateMark) => {
    test(`exchangePointAndMark swaps active and anchor (markMode is ${
      deactivateMark ? "deactivated" : "activated"
    })`, async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      await emulator.setMarkCommand();
      if (deactivateMark) {
        await emulator.setMarkCommand();
      }
      await emulator.runCommand("forwardChar");
      await emulator.runCommand("nextLine");
      if (deactivateMark) {
        assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(1, 1), new Position(1, 1))]);
      } else {
        assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(0, 0), new Position(1, 1))]);
      }

      await emulator.exchangePointAndMark();
      assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(1, 1), new Position(0, 0))]);

      await emulator.exchangePointAndMark();
      assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(0, 0), new Position(1, 1))]);
    });
  });

  test("exchangePointAndMark does not push marks", async () => {
    setEmptyCursors(activeTextEditor, [2, 2]);
    // C-<SPC> C-<SPC> to push and deactivate mark.
    await emulator.setMarkCommand();
    await emulator.setMarkCommand();
    // Now, [2, 2] was pushed to the mark ring.

    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.setMarkCommand();
    // [0, 0] was pushed to the mark ring.
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(0, 0), new Position(1, 1))]);

    await emulator.exchangePointAndMark();
    assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(1, 1), new Position(0, 0))]);

    await emulator.exchangePointAndMark();
    assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(0, 0), new Position(1, 1))]);

    await emulator.cancel();
    assertCursorsEqual(activeTextEditor, [1, 1]);

    await emulator.popMark();
    assertCursorsEqual(activeTextEditor, [0, 0]);

    await emulator.popMark();
    assertCursorsEqual(activeTextEditor, [2, 2]);

    await emulator.popMark();
    assertCursorsEqual(activeTextEditor, [0, 0]);
    // See, [1, 1] has never been pushed by exchange-point-and-mark
  });

  test("setMarkCommands resets mark ring pointer and exchangePointAndMark respects it", async () => {
    setEmptyCursors(activeTextEditor, [2, 2]);
    // C-<SPC> C-<SPC> to push and deactivate mark.
    await emulator.setMarkCommand();
    await emulator.setMarkCommand();
    // Now, [2, 2] was pushed to the mark ring.

    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.setMarkCommand();
    // [0, 0] was pushed to the mark ring.
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(0, 0), new Position(1, 1))]);

    await emulator.exchangePointAndMark();
    assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(1, 1), new Position(0, 0))]);
    // Pointer was exchanged, but [1, 1] was NOT pushed.

    await emulator.cancel();
    assertCursorsEqual(activeTextEditor, [0, 0]);

    setEmptyCursors(activeTextEditor, [0, 9]);

    await emulator.setMarkCommand();
    // Now, [0, 0] was pushed to the mark ring and the pointer was reset.
    await emulator.runCommand("backwardChar");
    await emulator.runCommand("nextLine");
    assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(0, 9), new Position(1, 8))]);

    await emulator.exchangePointAndMark();
    assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(1, 8), new Position(0, 9))]);
  });

  test("Successive exchangePointAndMark works correctly", async () => {
    setEmptyCursors(activeTextEditor, [2, 2]);
    // C-<SPC> C-<SPC> to push and deactivate mark.
    await emulator.setMarkCommand();
    await emulator.setMarkCommand();
    // Now, [2, 2] was pushed to the mark ring.

    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.setMarkCommand();
    // [0, 0] was pushed to the mark ring.
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(0, 0), new Position(1, 1))]);

    await emulator.exchangePointAndMark();
    assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(1, 1), new Position(0, 0))]);
    // Pointer was exchanged, but [1, 1] was NOT pushed.

    await emulator.exchangePointAndMark();
    assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(0, 0), new Position(1, 1))]);
    // [0, 0] was NOT pushed either.

    await emulator.cancel();
    assertCursorsEqual(activeTextEditor, [1, 1]);

    await emulator.exchangePointAndMark();
    assert.deepStrictEqual(activeTextEditor.selections, [new Selection(new Position(1, 1), new Position(0, 0))]);
  });

  test("set and pop marks", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]);
    // C-<SPC> C-<SPC> to push and deactivate mark.
    await emulator.setMarkCommand();
    await emulator.setMarkCommand();

    setEmptyCursors(activeTextEditor, [1, 4]);
    await emulator.setMarkCommand();
    await emulator.setMarkCommand();

    setEmptyCursors(activeTextEditor, [2, 6]);
    await emulator.setMarkCommand();
    await emulator.setMarkCommand();

    await emulator.popMark();
    assertCursorsEqual(activeTextEditor, [2, 6]);

    await emulator.popMark();
    assertCursorsEqual(activeTextEditor, [1, 4]);

    await emulator.popMark();
    assertCursorsEqual(activeTextEditor, [0, 2]);

    await emulator.popMark();
    assertCursorsEqual(activeTextEditor, [2, 6]);
  });

  test("Ctrl-u Ctrl-Space works as pop-mark", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]);
    // C-<SPC> C-<SPC> to push and deactivate mark.
    await emulator.setMarkCommand();
    await emulator.setMarkCommand();

    setEmptyCursors(activeTextEditor, [1, 4]);
    await emulator.setMarkCommand();
    await emulator.setMarkCommand();

    setEmptyCursors(activeTextEditor, [2, 6]);
    await emulator.setMarkCommand();
    await emulator.setMarkCommand();

    // C-u C-<SPC>.
    await emulator.universalArgument();
    await emulator.setMarkCommand();
    assertCursorsEqual(activeTextEditor, [2, 6]);

    await emulator.universalArgument();
    await emulator.setMarkCommand();
    assertCursorsEqual(activeTextEditor, [1, 4]);

    await emulator.universalArgument();
    await emulator.setMarkCommand();
    assertCursorsEqual(activeTextEditor, [0, 2]);

    await emulator.universalArgument();
    await emulator.setMarkCommand();
    assertCursorsEqual(activeTextEditor, [2, 6]);
  });
});
