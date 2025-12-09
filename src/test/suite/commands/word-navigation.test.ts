import { TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { Configuration } from "../../../configuration/configuration";
import {
  assertCursorsEqual,
  assertTextEqual,
  cleanUpWorkspace,
  clearTextEditor,
  createEmulator,
  setEmptyCursors,
  setupWorkspace,
} from "../utils";

suite("wordNavigationStyle", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace("int x;\n\nint y;");
    emulator = createEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  suite("emacs style", () => {
    setup(() => {
      Configuration.instance.wordNavigationStyle = "emacs";
    });

    teardown(() => {
      Configuration.reload();
    });

    test("forwardWord skips trailing separators across lines", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      await emulator.runCommand("forwardWord");
      assertCursorsEqual(activeTextEditor, [0, 3]);

      await emulator.runCommand("forwardWord");
      assertCursorsEqual(activeTextEditor, [0, 5]);

      await emulator.runCommand("forwardWord");
      assertCursorsEqual(activeTextEditor, [2, 3]); // Important! The cursor crosses the line boundary
    });

    test("backwardWord crosses lines", async () => {
      setEmptyCursors(activeTextEditor, [2, 5]);

      await emulator.runCommand("backwardWord");
      assertCursorsEqual(activeTextEditor, [2, 4]);

      await emulator.runCommand("backwardWord");
      assertCursorsEqual(activeTextEditor, [2, 0]);

      await emulator.runCommand("backwardWord");
      assertCursorsEqual(activeTextEditor, [0, 4]); // Important! The cursor crosses the line boundary
    });

    test("killWord uses the same word boundaries as forwardWord", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      await emulator.runCommand("killWord");
      assertTextEqual(activeTextEditor, " x;\n\nint y;");
      assertCursorsEqual(activeTextEditor, [0, 0]);

      await emulator.runCommand("killWord");
      assertTextEqual(activeTextEditor, ";\n\nint y;");
      assertCursorsEqual(activeTextEditor, [0, 0]);

      await emulator.runCommand("killWord");
      assertTextEqual(activeTextEditor, " y;");
      assertCursorsEqual(activeTextEditor, [0, 0]);

      await clearTextEditor(activeTextEditor);
      await emulator.runCommand("yank");
      assertTextEqual(activeTextEditor, "int x;\n\nint");
      assertCursorsEqual(activeTextEditor, [2, 3]);
    });

    test("backwardKillWord uses the same word boundaries as backwardWord", async () => {
      setEmptyCursors(activeTextEditor, [2, 5]);

      await emulator.runCommand("backwardKillWord");
      assertTextEqual(activeTextEditor, "int x;\n\nint ;");
      assertCursorsEqual(activeTextEditor, [2, 4]);

      await emulator.runCommand("backwardKillWord");
      assertTextEqual(activeTextEditor, "int x;\n\n;");
      assertCursorsEqual(activeTextEditor, [2, 0]);

      await emulator.runCommand("backwardKillWord");
      assertTextEqual(activeTextEditor, "int ;");
      assertCursorsEqual(activeTextEditor, [0, 4]);

      await clearTextEditor(activeTextEditor);
      await emulator.runCommand("yank");
      assertTextEqual(activeTextEditor, "x;\n\nint y");
      assertCursorsEqual(activeTextEditor, [2, 5]);
    });
  });

  suite("vscode style", () => {
    setup(() => {
      Configuration.instance.wordNavigationStyle = "vscode";
    });

    teardown(() => {
      Configuration.reload();
    });

    test("forwardWord follows VS Code navigation", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      await emulator.runCommand("forwardWord");
      assertCursorsEqual(activeTextEditor, [0, 3]);

      await emulator.runCommand("forwardWord");
      assertCursorsEqual(activeTextEditor, [0, 5]);

      await emulator.runCommand("forwardWord");
      assertCursorsEqual(activeTextEditor, [0, 6]); // Important! The cursor does not cross the line boundary

      await emulator.runCommand("forwardWord");
      assertCursorsEqual(activeTextEditor, [1, 0]); // Also, here the cursor moves to the beginning of the next blank line

      await emulator.runCommand("forwardWord");
      assertCursorsEqual(activeTextEditor, [2, 3]); // Finally, the cursor moves to the next word
    });

    test("backwardWord follows VS Code navigation", async () => {
      setEmptyCursors(activeTextEditor, [2, 5]);

      await emulator.runCommand("backwardWord");
      assertCursorsEqual(activeTextEditor, [2, 4]);

      await emulator.runCommand("backwardWord");
      assertCursorsEqual(activeTextEditor, [2, 0]);

      await emulator.runCommand("backwardWord");
      assertCursorsEqual(activeTextEditor, [1, 0]); // Important! The cursor moves to the previous blank line

      await emulator.runCommand("backwardWord");
      assertCursorsEqual(activeTextEditor, [0, 4]); // Finally, the cursor moves to the previous word
    });

    test("killWord uses the same word boundaries as forwardWord", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      await emulator.runCommand("killWord");
      assertTextEqual(activeTextEditor, " x;\n\nint y;");
      assertCursorsEqual(activeTextEditor, [0, 0]);

      await emulator.runCommand("killWord");
      assertTextEqual(activeTextEditor, ";\n\nint y;");
      assertCursorsEqual(activeTextEditor, [0, 0]);

      await emulator.runCommand("killWord");
      assertTextEqual(activeTextEditor, "\n\nint y;");
      assertCursorsEqual(activeTextEditor, [0, 0]);

      await emulator.runCommand("killWord");
      assertTextEqual(activeTextEditor, "\nint y;");
      assertCursorsEqual(activeTextEditor, [0, 0]);

      await emulator.runCommand("killWord");
      assertTextEqual(activeTextEditor, " y;");
      assertCursorsEqual(activeTextEditor, [0, 0]);

      await clearTextEditor(activeTextEditor);
      await emulator.runCommand("yank");
      assertTextEqual(activeTextEditor, "int x;\n\nint");
      assertCursorsEqual(activeTextEditor, [2, 3]);
    });

    test("backwardKillWord uses the same word boundaries as backwardWord", async () => {
      setEmptyCursors(activeTextEditor, [2, 5]);

      await emulator.runCommand("backwardKillWord");
      assertTextEqual(activeTextEditor, "int x;\n\nint ;");
      assertCursorsEqual(activeTextEditor, [2, 4]);

      await emulator.runCommand("backwardKillWord");
      assertTextEqual(activeTextEditor, "int x;\n\n;");
      assertCursorsEqual(activeTextEditor, [2, 0]);

      await emulator.runCommand("backwardKillWord");
      assertTextEqual(activeTextEditor, "int x;\n;");
      assertCursorsEqual(activeTextEditor, [1, 0]);

      await emulator.runCommand("backwardKillWord");
      assertTextEqual(activeTextEditor, "int ;");
      assertCursorsEqual(activeTextEditor, [0, 4]);

      await clearTextEditor(activeTextEditor);
      await emulator.runCommand("yank");

      assertTextEqual(activeTextEditor, "x;\n\nint y");
      assertCursorsEqual(activeTextEditor, [2, 5]);
    });
  });
});
