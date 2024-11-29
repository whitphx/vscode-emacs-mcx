import assert from "assert";
import * as vscode from "vscode";
import { EmacsEmulator } from "../../emulator";
import { cleanUpWorkspace, setupWorkspace, setEmptyCursors } from "./utils";
import { Configuration } from "../../configuration/configuration";

suite("onDidChangeTextEditorVisibleRanges event listener with strictEmacsMove", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "x\n".repeat(1000);
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor); // `EmacsEmulator`'s constructor registers the event listener
  });

  teardown(async () => {
    await cleanUpWorkspace();
    emulator.dispose();
  });

  setup(() => {});
  teardown(() => {
    Configuration.reload();
  });

  test("it should keep cursor position in the visible range when scrolling when strictEmacsMove = true", async () => {
    Configuration.instance.strictEmacsMove = true;

    setEmptyCursors(activeTextEditor, [0, 0]);

    await vscode.commands.executeCommand("editorScroll", { to: "down", by: "page", value: 3 });

    assert.strictEqual(activeTextEditor.selection.active.line, activeTextEditor.visibleRanges[0]!.start.line);

    Configuration.reload();
  });

  test("it shouldn't keep cursor position in the visible range when scrolling when strictEmacsMove = false", async () => {
    Configuration.instance.strictEmacsMove = false;

    setEmptyCursors(activeTextEditor, [0, 0]);

    await vscode.commands.executeCommand("editorScroll", { to: "down", by: "page", value: 3 });

    assert.strictEqual(activeTextEditor.selection.active.line, 0);

    Configuration.reload();
  });
});
