import * as assert from "assert";
import * as expect from "expect";
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

  const edits: Array<[string, () => Thenable<any>]> = [
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

  test("exchangePointAndMark swaps active and anchor", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.setMarkCommand();
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    expect(activeTextEditor.selections).toEqual([new Selection(new Position(0, 0), new Position(1, 1))]);

    await emulator.exchangePointAndMark();
    expect(activeTextEditor.selections).toEqual([new Selection(new Position(1, 1), new Position(0, 0))]);

    await emulator.exchangePointAndMark();
    expect(activeTextEditor.selections).toEqual([new Selection(new Position(0, 0), new Position(1, 1))]);
  });

  test("set and pop marks", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]);
    // Continuous double C-<SPC> (C-<SPC> C-<SPC>).
    await emulator.setMarkCommand();
    await emulator.setMarkCommand();

    setEmptyCursors(activeTextEditor, [1, 4]);
    await emulator.setMarkCommand();
    await emulator.setMarkCommand();

    setEmptyCursors(activeTextEditor, [2, 6]);
    await emulator.setMarkCommand();
    await emulator.setMarkCommand();

    await emulator.popMark();
    assertCursorsEqual(activeTextEditor, [1, 4]);

    await emulator.popMark();
    assertCursorsEqual(activeTextEditor, [0, 2]);

    await emulator.popMark();
    assertCursorsEqual(activeTextEditor, [2, 6]);
  });

  test("Ctrl-u Ctrl-Space works as pop-mark", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]);
    // Continuous double C-<SPC> (C-<SPC> C-<SPC>).
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
    assertCursorsEqual(activeTextEditor, [1, 4]);

    await emulator.universalArgument();
    await emulator.setMarkCommand();
    assertCursorsEqual(activeTextEditor, [0, 2]);

    await emulator.universalArgument();
    await emulator.setMarkCommand();
    assertCursorsEqual(activeTextEditor, [2, 6]);
  });
});
