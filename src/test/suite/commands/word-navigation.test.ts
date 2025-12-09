import { TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { Configuration } from "../../../configuration/configuration";
import {
  assertCursorsEqual,
  assertTextEqual,
  cleanUpWorkspace,
  createEmulator,
  setEmptyCursors,
  setupWorkspace,
} from "../utils";

suite("wordNavigationStyle", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace("int x;\nint y;");
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
      await emulator.runCommand("forwardWord");
      await emulator.runCommand("forwardWord");

      assertCursorsEqual(activeTextEditor, [1, 3]);
    });

    test("killWord uses the same word boundaries", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      await emulator.runCommand("killWord");
      await emulator.runCommand("killWord");
      await emulator.runCommand("killWord");

      assertTextEqual(activeTextEditor, " y;");
      assertCursorsEqual(activeTextEditor, [0, 0]);
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
      await emulator.runCommand("forwardWord");
      await emulator.runCommand("forwardWord");

      assertCursorsEqual(activeTextEditor, [0, 6]);
    });

    test("killWord aligns with VS Code word stops", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      await emulator.runCommand("killWord");
      await emulator.runCommand("killWord");
      await emulator.runCommand("killWord");

      assertTextEqual(activeTextEditor, "\nint y;");
      assertCursorsEqual(activeTextEditor, [0, 0]);
    });
  });
});
