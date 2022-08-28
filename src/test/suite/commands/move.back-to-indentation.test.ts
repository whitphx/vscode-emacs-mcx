import * as vscode from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertCursorsEqual, setEmptyCursors, setupWorkspace, cleanUpWorkspace } from "../utils";

suite("back-to-indentation", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialtext =
      `non-indented-line
    4-space-indented-line
non-indented-line with space
    4-space-indented-line with space` + "\n    "; // Empty but indented line
    activeTextEditor = await setupWorkspace(initialtext);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  (
    [
      [1, 0], // At the beginning of the line
      [1, 2], // At the middle of the indentation
      [1, 4], // At the indentation
      [1, 6], // After the indentation
    ] as [number, number][]
  ).forEach((startPosition) => {
    test(`moving from ${startPosition} to the indented text ([1, 4])`, async () => {
      setEmptyCursors(activeTextEditor, startPosition);

      await emulator.runCommand("backToIndentation");

      assertCursorsEqual(activeTextEditor, [1, 4]);
    });
  });

  (
    [
      [3, 0], // At the beginning of the line
      [3, 2], // At the middle of the indentation
      [3, 4], // At the indentation
      [3, 6], // After the indentation
    ] as [number, number][]
  ).forEach((startPosition) => {
    test(`moving from ${startPosition} to the indented text ([1, 4]) with a line containing another white space`, async () => {
      setEmptyCursors(activeTextEditor, startPosition);

      await emulator.runCommand("backToIndentation");

      assertCursorsEqual(activeTextEditor, [3, 4]);
    });
  });

  (
    [
      [0, 0],
      [0, 2],
    ] as [number, number][]
  ).forEach((startPosition) => {
    test(`moving from ${startPosition} to the beginning of the line ([0, 0]) if there is no indentation`, async () => {
      setEmptyCursors(activeTextEditor, startPosition);

      await emulator.runCommand("backToIndentation");

      assertCursorsEqual(activeTextEditor, [0, 0]);
    });
  });

  (
    [
      [2, 0],
      [2, 2],
    ] as [number, number][]
  ).forEach((startPosition) => {
    test(`moving from ${startPosition} to the beginning of the line ([2, 0]) if there is no indentation`, async () => {
      setEmptyCursors(activeTextEditor, startPosition);

      await emulator.runCommand("backToIndentation");

      assertCursorsEqual(activeTextEditor, [2, 0]);
    });
  });

  (
    [
      [4, 0],
      [4, 2],
    ] as [number, number][]
  ).forEach((startPosition) => {
    test(`moving from ${startPosition} to the end of the line ([4, 4]) if there is indentation but no content`, async () => {
      setEmptyCursors(activeTextEditor, startPosition);

      await emulator.runCommand("backToIndentation");

      assertCursorsEqual(activeTextEditor, [4, 4]);
    });
  });
});
