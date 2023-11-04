import * as vscode from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertTextEqual, cleanUpWorkspace, setEmptyCursors, assertCursorsEqual, setupWorkspace } from "../utils";

suite("Reindent", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  suite("new indent", () => {
    const initialText = `function() {

}`;
    setup(async () => {
      activeTextEditor = await setupWorkspace(initialText, { language: "javascript" });
      activeTextEditor.options.tabSize = 2;
      emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("reindent works when the cursor is at the line where it should", async () => {
      setEmptyCursors(activeTextEditor, [1, 0]);
      await emulator.runCommand("reindent");
      assertTextEqual(
        activeTextEditor,
        `function() {
  
}`,
      );
      assertCursorsEqual(activeTextEditor, [1, 2]);
    });

    test("reindent doesn't work when the cursor is at the line where it shouldn't", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);
      await emulator.runCommand("reindent");
      assertTextEqual(activeTextEditor, initialText);
      assertCursorsEqual(activeTextEditor, [1, 2]);
    });
  });

  suite("reindent existing lines", () => {
    const initialText = `function() {
      console.log("hello");
}`;

    setup(async () => {
      activeTextEditor = await setupWorkspace(initialText, { language: "javascript" });
      activeTextEditor.options.tabSize = 2;
      emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("reindent works and the cursor is moved to the indent head when the cursor was at the beginning fo the line", async () => {
      setEmptyCursors(activeTextEditor, [1, 0]);
      await emulator.runCommand("reindent");
      assertTextEqual(
        activeTextEditor,
        `function() {
  console.log("hello");
}`,
      );
      assertCursorsEqual(activeTextEditor, [1, 2]);
    });

    test("reindent works and the cursor is not moved when the cursor was after the indent head", async () => {
      setEmptyCursors(activeTextEditor, [1, 8]);
      await emulator.runCommand("reindent");
      assertTextEqual(
        activeTextEditor,
        `function() {
  console.log("hello");
}`,
      );
      assertCursorsEqual(activeTextEditor, [1, 4]);
    });
  });
});
