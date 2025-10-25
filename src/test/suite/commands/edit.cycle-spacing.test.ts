import * as vscode from "vscode";
import { EmacsEmulator } from "../../../emulator";
import {
  assertTextEqual,
  cleanUpWorkspace,
  setEmptyCursors,
  assertCursorsEqual,
  setupWorkspace,
  createEmulator,
  delay,
} from "../utils";

suite("cycle-spacing", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  suite("basic cycling behavior with spaces", () => {
    setup(async () => {
      const initialText = "foo   bar";
      activeTextEditor = await setupWorkspace(initialText);
      emulator = createEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("first call: replace all spaces with one space", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]); // cursor in middle of spaces
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar");
      assertCursorsEqual(activeTextEditor, [0, 4]); // cursor after the single space
    });

    test("second call: delete all spaces", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]); // cursor in middle of spaces
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foobar");
      assertCursorsEqual(activeTextEditor, [0, 3]); // cursor between foo and bar
    });

    test("third call: restore original spacing", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]); // cursor in middle of spaces
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foobar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo   bar");
      assertCursorsEqual(activeTextEditor, [0, 3]); // cursor at original position within spacing
    });

    test("fourth call: cycles back to one space", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]); // cursor in middle of spaces
      await emulator.runCommand("cycleSpacing");
      await emulator.runCommand("cycleSpacing");
      await emulator.runCommand("cycleSpacing");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar");
      assertCursorsEqual(activeTextEditor, [0, 4]); // cursor after the single space
    });
  });

  suite("cycling with cursor at different positions", () => {
    setup(async () => {
      const initialText = "foo   bar";
      activeTextEditor = await setupWorkspace(initialText);
      emulator = createEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("cursor before spaces", async () => {
      setEmptyCursors(activeTextEditor, [0, 3]); // cursor right after "foo"
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foobar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo   bar");
    });

    test("cursor after spaces", async () => {
      setEmptyCursors(activeTextEditor, [0, 6]); // cursor right before "bar"
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foobar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo   bar");
    });
  });

  suite("cycling with tabs", () => {
    setup(async () => {
      const initialText = "foo\t\t\tbar";
      activeTextEditor = await setupWorkspace(initialText);
      emulator = createEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("replaces tabs with single space, then deletes, then restores", async () => {
      setEmptyCursors(activeTextEditor, [0, 4]); // cursor in middle of tabs
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foobar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo\t\t\tbar");
    });
  });

  suite("cycling with mixed spaces and tabs", () => {
    setup(async () => {
      const initialText = "foo  \t \t bar";
      activeTextEditor = await setupWorkspace(initialText);
      emulator = createEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("handles mixed whitespace", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]); // cursor in middle of whitespace
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foobar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo  \t \t bar");
    });
  });

  suite("multi-cursor support", () => {
    setup(async () => {
      const initialText = "foo   bar\nbaz  qux";
      activeTextEditor = await setupWorkspace(initialText);
      emulator = createEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("cycles spacing at multiple cursors independently", async () => {
      setEmptyCursors(activeTextEditor, [0, 5], [1, 4]); // cursors in both whitespace regions
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar\nbaz qux");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foobar\nbazqux");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo   bar\nbaz  qux");
    });
  });

  suite("edge cases", () => {
    setup(async () => {
      const initialText = "foobar";
      activeTextEditor = await setupWorkspace(initialText);
      emulator = createEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("no whitespace around cursor: no effect", async () => {
      setEmptyCursors(activeTextEditor, [0, 3]); // cursor in middle of "foobar"
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foobar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foobar");
    });
  });

  suite("interruption handling", () => {
    setup(async () => {
      const initialText = "foo   bar";
      activeTextEditor = await setupWorkspace(initialText);
      emulator = createEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("interruption resets cycling state", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]); // cursor in middle of spaces
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar"); // one space
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foobar"); // no space

      // Interrupt by simulating user-cancel
      emulator.onDidInterruptTextEditor({ reason: "user-cancel" });

      // Next call should start from beginning (one space), not continue to restore
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar"); // one space (not restored)
    });

    test("cursor movement interrupts cycling", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]); // cursor in middle of spaces
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar"); // one space

      // Move cursor (this should interrupt)
      setEmptyCursors(activeTextEditor, [0, 0]);
      await delay(100); // Wait for interruption to be processed

      // Move cursor back and call again - should start from beginning
      setEmptyCursors(activeTextEditor, [0, 4]);
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foobar"); // no space (second state, not third)
    });

    test("document change interrupts cycling", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]); // cursor in middle of spaces
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar"); // one space

      // Simulate document change interruption
      emulator.onDidInterruptTextEditor({
        reason: "document-changed",
        originalEvent: {
          reason: undefined,
          contentChanges: [],
          document: activeTextEditor.document,
        },
      });

      // Next call should start from beginning
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar"); // one space (restarted cycle)
    });
  });

  suite("with asymmetric spacing", () => {
    setup(async () => {
      const initialText = "foo  bar";
      activeTextEditor = await setupWorkspace(initialText);
      emulator = createEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("cursor left of center: preserves left spacing on restore", async () => {
      setEmptyCursors(activeTextEditor, [0, 4]); // cursor after first space
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foobar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo  bar");
      assertCursorsEqual(activeTextEditor, [0, 4]); // cursor at position where one space was before
    });

    test("cursor right of center: preserves right spacing on restore", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]); // cursor after second space
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foobar");
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo  bar");
      assertCursorsEqual(activeTextEditor, [0, 5]); // cursor at original position
    });
  });

  suite("single space case", () => {
    setup(async () => {
      const initialText = "foo bar";
      activeTextEditor = await setupWorkspace(initialText);
      emulator = createEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("cycling on single space", async () => {
      setEmptyCursors(activeTextEditor, [0, 4]); // cursor in the single space
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar"); // stays one space
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foobar"); // deletes the space
      await emulator.runCommand("cycleSpacing");
      assertTextEqual(activeTextEditor, "foo bar"); // restores the single space
    });
  });
});
