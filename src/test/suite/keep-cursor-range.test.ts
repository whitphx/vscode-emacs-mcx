import assert from "assert";
import * as vscode from "vscode";
import { EmacsEmulator } from "../../emulator";
import { cleanUpWorkspace, setupWorkspace, setEmptyCursors, assertCursorsEqual, delay, createEmulator } from "./utils";
import { Configuration } from "../../configuration/configuration";

suite("onDidChangeTextEditorVisibleRanges event listener with keepCursorInVisibleRange", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "xxxx\n".repeat(1000).slice(0, -1); // Delete the last newline
    activeTextEditor = await setupWorkspace(initialText);
    emulator = createEmulator(activeTextEditor); // `EmacsEmulator`'s constructor registers the event listener
  });

  teardown(async () => {
    await cleanUpWorkspace();
    emulator.dispose();
  });

  setup(() => {});
  teardown(() => {
    Configuration.reload();
  });

  test("it should keep cursor position in the visible range when scrolling when keepCursorInVisibleRange = true", async () => {
    Configuration.instance.keepCursorInVisibleRange = true;

    setEmptyCursors(activeTextEditor, [0, 0]);

    await vscode.commands.executeCommand("editorScroll", { to: "down", by: "page", value: 3 });

    assert.strictEqual(activeTextEditor.selection.active.line, activeTextEditor.visibleRanges[0]!.start.line);

    Configuration.reload();
  });

  test("it shouldn't keep cursor position in the visible range when scrolling when keepCursorInVisibleRange = false", async () => {
    Configuration.instance.keepCursorInVisibleRange = false;

    setEmptyCursors(activeTextEditor, [0, 0]);

    await vscode.commands.executeCommand("editorScroll", { to: "down", by: "page", value: 3 });

    assert.strictEqual(activeTextEditor.selection.active.line, 0);

    Configuration.reload();
  });

  test("backspace works correctly keeping the cursor at the right position, when keepCursorInVisibleRange = true and the cursor is in the last line", async () => {
    Configuration.instance.keepCursorInVisibleRange = true;

    const lastLine = activeTextEditor.document.lineCount - 1;
    const lastChar = activeTextEditor.document.lineAt(lastLine).text.length;

    setEmptyCursors(activeTextEditor, [lastLine, lastChar]);
    activeTextEditor.revealRange(new vscode.Range(lastLine, lastChar, lastLine, lastChar));

    await vscode.commands.executeCommand("deleteLeft");

    await delay(10); // Wait for the event listeners are called after the edit.

    assertCursorsEqual(activeTextEditor, [lastLine, lastChar - 1]);

    Configuration.reload();
  });
});
