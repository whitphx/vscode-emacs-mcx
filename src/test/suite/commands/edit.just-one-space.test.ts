import * as vscode from "vscode";
import { EmacsEmulator } from "../../../emulator";
import {
  assertTextEqual,
  cleanUpWorkspace,
  setEmptyCursors,
  assertCursorsEqual,
  setupWorkspace,
  createEmulator,
} from "../utils";

suite("just-one-space", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  teardown(cleanUpWorkspace);

  suite("with spaces", () => {
    const initialText = "a   b\na   b";

    setup(async () => {
      activeTextEditor = await setupWorkspace(initialText);
      emulator = createEmulator(activeTextEditor);
    });

    test("replaces multiple spaces around cursor with one space", async () => {
      setEmptyCursors(activeTextEditor, [0, 2]);
      await emulator.runCommand("justOneSpace");
      assertTextEqual(activeTextEditor, "a b\na   b");
      assertCursorsEqual(activeTextEditor, [0, 2]);
    });

    test("works with multi-cursor", async () => {
      setEmptyCursors(activeTextEditor, [0, 2], [1, 2]);
      await emulator.runCommand("justOneSpace");
      assertTextEqual(activeTextEditor, "a b\na b");
      assertCursorsEqual(activeTextEditor, [0, 2], [1, 2]);
    });

    test("inserts a space when there is no space around cursor", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);
      await emulator.runCommand("justOneSpace");
      assertTextEqual(activeTextEditor, " a   b\na   b");
      assertCursorsEqual(activeTextEditor, [0, 1]);
    });

    test("reduces to one space when cursor is at the start of whitespace region", async () => {
      setEmptyCursors(activeTextEditor, [0, 1]);
      await emulator.runCommand("justOneSpace");
      assertTextEqual(activeTextEditor, "a b\na   b");
      assertCursorsEqual(activeTextEditor, [0, 2]);
    });

    test("reduces to one space when cursor is at end of whitespace region", async () => {
      setEmptyCursors(activeTextEditor, [0, 4]);
      await emulator.runCommand("justOneSpace");
      assertTextEqual(activeTextEditor, "a b\na   b");
      assertCursorsEqual(activeTextEditor, [0, 2]);
    });
  });

  suite("with tabs", () => {
    const initialText = "a\t\t\tb";

    setup(async () => {
      activeTextEditor = await setupWorkspace(initialText);
      emulator = createEmulator(activeTextEditor);
    });

    test("replaces tabs around cursor with one space", async () => {
      setEmptyCursors(activeTextEditor, [0, 2]);
      await emulator.runCommand("justOneSpace");
      assertTextEqual(activeTextEditor, "a b");
      assertCursorsEqual(activeTextEditor, [0, 2]);
    });
  });

  suite("with prefix argument", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("a   b");
      emulator = createEmulator(activeTextEditor);
    });

    test("leaves n spaces with positive prefix argument", async () => {
      setEmptyCursors(activeTextEditor, [0, 2]);
      await emulator.universalArgument(); // C-u sets prefix to 4
      await emulator.runCommand("justOneSpace");
      assertTextEqual(activeTextEditor, "a    b");
      assertCursorsEqual(activeTextEditor, [0, 5]);
    });
  });

  suite("with negative prefix argument (deletes newlines too)", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("a  \n  \n  b");
      emulator = createEmulator(activeTextEditor);
    });

    test("deletes newlines and spaces, leaving one space", async () => {
      setEmptyCursors(activeTextEditor, [0, 2]);
      await emulator.negativeArgument();
      await emulator.runCommand("justOneSpace");
      assertTextEqual(activeTextEditor, "a b");
      assertCursorsEqual(activeTextEditor, [0, 2]);
    });
  });

  suite("with no surrounding spaces", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("ab");
      emulator = createEmulator(activeTextEditor);
    });

    test("inserts one space at cursor position", async () => {
      setEmptyCursors(activeTextEditor, [0, 1]);
      await emulator.runCommand("justOneSpace");
      assertTextEqual(activeTextEditor, "a b");
      assertCursorsEqual(activeTextEditor, [0, 2]);
    });
  });

  suite("with multi-cursor in different whitespace groups on the same line", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("a   b   c");
      emulator = createEmulator(activeTextEditor);
    });

    test("reduces both whitespace groups with cursors in each", async () => {
      setEmptyCursors(activeTextEditor, [0, 2], [0, 6]);
      await emulator.runCommand("justOneSpace");
      assertTextEqual(activeTextEditor, "a b c");
      assertCursorsEqual(activeTextEditor, [0, 2], [0, 4]);
    });
  });

  suite("with two cursors in the same whitespace span", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("a     b");
      emulator = createEmulator(activeTextEditor);
    });

    test("produces one space even with two cursors in the same whitespace region", async () => {
      setEmptyCursors(activeTextEditor, [0, 2], [0, 4]);
      await emulator.runCommand("justOneSpace");
      assertTextEqual(activeTextEditor, "a b");
    });
  });

  suite("when already exactly one space", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("a b");
      emulator = createEmulator(activeTextEditor);
    });

    test("leaves the single space unchanged", async () => {
      setEmptyCursors(activeTextEditor, [0, 1]);
      await emulator.runCommand("justOneSpace");
      assertTextEqual(activeTextEditor, "a b");
      assertCursorsEqual(activeTextEditor, [0, 2]);
    });
  });
});
