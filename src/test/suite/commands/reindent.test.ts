import * as vscode from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertTextEqual, cleanUpWorkspace, setEmptyCursors, assertCursorsEqual, setupWorkspace } from "../utils";

suite("Reindent", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  const initialText = `function() {

}`;

  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText, { language: "javascript" });
    activeTextEditor.options.tabSize = 2;
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("indent", async () => {
    setEmptyCursors(activeTextEditor, [1, 0]);
    await emulator.runCommand("reindent");
    assertTextEqual(
      activeTextEditor,
      `function() {
  
}`,
    );
    assertCursorsEqual(activeTextEditor, [1, 2]);
  });
});
