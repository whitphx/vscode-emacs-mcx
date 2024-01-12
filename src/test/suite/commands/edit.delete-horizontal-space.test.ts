import * as vscode from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertTextEqual, cleanUpWorkspace, setEmptyCursors, assertCursorsEqual, setupWorkspace } from "../utils";

[" ", "\t"].forEach((space) => {
  suite(`delete-horizontal-space with ${JSON.stringify(space)}`, () => {
    let activeTextEditor: vscode.TextEditor;
    let emulator: EmacsEmulator;

    const initialText = `a${space}${space}${space}b\na${space}${space}${space}b`;

    setup(async () => {
      activeTextEditor = await setupWorkspace(initialText);
      emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    (
      [
        [0, false],
        [1, true],
        [2, true],
        [3, true],
        [4, true],
        [5, false],
      ] as const
    ).forEach(([charPos, shouldHaveEffect]) => {
      test(`delete white spaces before and after the cursor at ${charPos} in each line`, async () => {
        setEmptyCursors(activeTextEditor, [0, charPos], [1, charPos]);
        await emulator.runCommand("deleteHorizontalSpace");
        if (shouldHaveEffect) {
          assertTextEqual(activeTextEditor, "ab\nab");
          assertCursorsEqual(activeTextEditor, [0, 1], [1, 1]);
        } else {
          assertTextEqual(activeTextEditor, initialText);
          assertCursorsEqual(activeTextEditor, [0, charPos], [1, charPos]);
        }
      });
    });

    (
      [
        [0, false, `a${space}${space}${space}b\na${space}${space}${space}b`],
        [1, true, `a${space}${space}${space}b\na${space}${space}${space}b`],
        [2, true, `a${space}${space}b\na${space}${space}b`],
        [3, true, `a${space}b\na${space}b`],
        [4, true, `ab\nab`],
        [5, false, `a${space}${space}${space}b\na${space}${space}${space}b`],
      ] as const
    ).forEach(([charPos, shouldHaveEffect, expected]) => {
      test(`delete white spaces only before and after the cursor at ${charPos} in each line when the prefix argument is set`, async () => {
        setEmptyCursors(activeTextEditor, [0, charPos], [1, charPos]);
        await emulator.universalArgument();
        await emulator.runCommand("deleteHorizontalSpace");
        assertTextEqual(activeTextEditor, expected);
        if (shouldHaveEffect) {
          assertCursorsEqual(activeTextEditor, [0, 1], [1, 1]);
        } else {
          assertCursorsEqual(activeTextEditor, [0, charPos], [1, charPos]);
        }
      });
    });
  });
});
