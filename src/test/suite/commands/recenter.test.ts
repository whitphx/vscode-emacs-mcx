import assert from "assert";
import vscode from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { setupWorkspace, cleanUpWorkspace, delay } from "../utils";

suite("RecenterTopBottom", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "\n".repeat(1000);
    activeTextEditor = await setupWorkspace(initialText, { language: "markdown" }); // language=markdown sets wordWrap = true
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("it sees only the active cursor ignoring the anchor", async () => {
    activeTextEditor.selection = new vscode.Selection(100, 0, 500, 0);

    await emulator.runCommand("recenterTopBottom");
    await delay(1000);

    assert.ok(
      activeTextEditor.visibleRanges[0]?.contains(activeTextEditor.selection.active),
      `The active cursor ${JSON.stringify(
        activeTextEditor.selection.active,
      )} is not contained in the visible range ${JSON.stringify(activeTextEditor.visibleRanges[0])}`,
    );
    assert.ok(
      !activeTextEditor.visibleRanges[0]?.contains(activeTextEditor.selection.anchor),
      `The anchor cursor ${JSON.stringify(
        activeTextEditor.selection.anchor,
      )} is contained in the visible range ${JSON.stringify(activeTextEditor.visibleRanges[0])}`,
    );
  });
});
