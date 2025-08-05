import * as vscode from "vscode";
import assert from "assert";
import { TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { delay, setEmptyCursors, setupWorkspace, createEmulator } from "../utils";

suite("Other window", () => {
  let anotherTextEditor: TextEditor;
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    anotherTextEditor = await setupWorkspace("a\n".repeat(400), { column: vscode.ViewColumn.One });
    activeTextEditor = await setupWorkspace("b\n".repeat(400), { column: vscode.ViewColumn.Two });

    setEmptyCursors(anotherTextEditor, [100, 0]);
    anotherTextEditor.revealRange(new vscode.Range(100, 0, 100, 0), vscode.TextEditorRevealType.InCenter);
    setEmptyCursors(activeTextEditor, [100, 0]);
    activeTextEditor.revealRange(new vscode.Range(100, 0, 100, 0), vscode.TextEditorRevealType.InCenter);

    emulator = createEmulator(activeTextEditor);
  });

  suite("scroll-other-window", () => {
    test("it scrolls the other window and keeps the cursor position", async () => {
      await delay(100);

      const initialVisibleRangesInAnotherEditor = anotherTextEditor.visibleRanges;
      const initialVisibleRangesInActiveEditor = activeTextEditor.visibleRanges;

      await emulator.runCommand("scrollOtherWindow");

      await delay(100);

      const newVisibleRangesInAnotherEditor = anotherTextEditor.visibleRanges;
      const newVisibleRangesInActiveEditor = activeTextEditor.visibleRanges;

      assert.ok(
        newVisibleRangesInAnotherEditor[0]!.start.line > initialVisibleRangesInAnotherEditor[0]!.start.line,
        "The other window should be scrolled down.",
      );
      assert.equal(
        newVisibleRangesInActiveEditor[0]!.start.line,
        initialVisibleRangesInActiveEditor[0]!.start.line,
        "The active window should not be scrolled.",
      );
    });
  });

  suite("scroll-other-window-down", () => {
    test("it scrolls the other window and keeps the cursor position", async () => {
      await delay(100);

      const initialVisibleRangesInAnotherEditor = anotherTextEditor.visibleRanges;
      const initialVisibleRangesInActiveEditor = activeTextEditor.visibleRanges;

      await emulator.runCommand("scrollOtherWindowDown");

      await delay(100);

      const newVisibleRangesInAnotherEditor = anotherTextEditor.visibleRanges;
      const newVisibleRangesInActiveEditor = activeTextEditor.visibleRanges;

      assert.ok(
        newVisibleRangesInAnotherEditor[0]!.start.line < initialVisibleRangesInAnotherEditor[0]!.start.line,
        "The other window should be scrolled up.",
      );
      assert.equal(
        newVisibleRangesInActiveEditor[0]!.start.line,
        initialVisibleRangesInActiveEditor[0]!.start.line,
        "The active window should not be scrolled.",
      );
    });
  });
});
