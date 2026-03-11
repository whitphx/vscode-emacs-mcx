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

suite("cycle-spacing", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  teardown(cleanUpWorkspace);

  suite("step 1: just-one-space", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("word1   word2");
      emulator = createEmulator(activeTextEditor);
    });

    test("cursor in middle of whitespace: replace with single space", async () => {
      setEmptyCursors(activeTextEditor, [0, 7]); // 2nd space of "   "
      await emulator.runCommand("cycleSpacing");

      assertTextEqual(activeTextEditor, "word1 word2");
      assertCursorsEqual(activeTextEditor, [0, 6]); // after the single space
    });

    test("cursor at start of whitespace", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]); // 1st space
      await emulator.runCommand("cycleSpacing");

      assertTextEqual(activeTextEditor, "word1 word2");
      assertCursorsEqual(activeTextEditor, [0, 6]);
    });

    test("cursor at end of whitespace", async () => {
      setEmptyCursors(activeTextEditor, [0, 8]); // just before 'word2'
      await emulator.runCommand("cycleSpacing");

      assertTextEqual(activeTextEditor, "word1 word2");
      assertCursorsEqual(activeTextEditor, [0, 6]);
    });

    test("no whitespace: inserts a space", async () => {
      activeTextEditor = await setupWorkspace("word1word2");
      emulator = createEmulator(activeTextEditor);
      setEmptyCursors(activeTextEditor, [0, 5]); // between 'd' and 'w'
      await emulator.runCommand("cycleSpacing");

      assertTextEqual(activeTextEditor, "word1 word2");
      assertCursorsEqual(activeTextEditor, [0, 6]);
    });

    test("tabs are treated as whitespace", async () => {
      activeTextEditor = await setupWorkspace("word1\t\tword2");
      emulator = createEmulator(activeTextEditor);
      setEmptyCursors(activeTextEditor, [0, 6]); // between the tabs
      await emulator.runCommand("cycleSpacing");

      assertTextEqual(activeTextEditor, "word1 word2");
      assertCursorsEqual(activeTextEditor, [0, 6]);
    });

    test("mixed spaces and tabs are replaced by single space", async () => {
      activeTextEditor = await setupWorkspace("word1 \t word2");
      emulator = createEmulator(activeTextEditor);
      setEmptyCursors(activeTextEditor, [0, 7]); // in the middle of mixed whitespace
      await emulator.runCommand("cycleSpacing");

      assertTextEqual(activeTextEditor, "word1 word2");
      assertCursorsEqual(activeTextEditor, [0, 6]);
    });

    test("prefix argument controls number of spaces inserted", async () => {
      setEmptyCursors(activeTextEditor, [0, 7]);
      await emulator.digitArgument(2);
      await emulator.runCommand("cycleSpacing");

      assertTextEqual(activeTextEditor, "word1  word2");
      assertCursorsEqual(activeTextEditor, [0, 7]); // after 2 spaces: col 5 + 2 = 7
    });

    test("prefix argument 0 deletes all whitespace", async () => {
      setEmptyCursors(activeTextEditor, [0, 7]);
      await emulator.digitArgument(0);
      await emulator.runCommand("cycleSpacing");

      assertTextEqual(activeTextEditor, "word1word2");
      assertCursorsEqual(activeTextEditor, [0, 5]);
    });
  });

  suite("step 2: delete-horizontal-space (consecutive)", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("word1   word2");
      emulator = createEmulator(activeTextEditor);
    });

    test("two consecutive invocations delete all whitespace", async () => {
      setEmptyCursors(activeTextEditor, [0, 7]);
      await emulator.runCommand("cycleSpacing"); // step 1
      await emulator.runCommand("cycleSpacing"); // step 2

      assertTextEqual(activeTextEditor, "word1word2");
      assertCursorsEqual(activeTextEditor, [0, 5]);
    });
  });

  suite("step 3: restore original whitespace (consecutive)", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("word1   word2");
      emulator = createEmulator(activeTextEditor);
    });

    test("three consecutive invocations restore original text and cursor", async () => {
      setEmptyCursors(activeTextEditor, [0, 7]); // 2nd space, offset 2 from whitespace start
      await emulator.runCommand("cycleSpacing"); // step 1
      await emulator.runCommand("cycleSpacing"); // step 2
      await emulator.runCommand("cycleSpacing"); // step 3

      assertTextEqual(activeTextEditor, "word1   word2");
      assertCursorsEqual(activeTextEditor, [0, 7]); // restored to original position
    });

    test("restore from cursor at start of original whitespace", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]); // start of whitespace, offset 0
      await emulator.runCommand("cycleSpacing");
      await emulator.runCommand("cycleSpacing");
      await emulator.runCommand("cycleSpacing");

      assertTextEqual(activeTextEditor, "word1   word2");
      assertCursorsEqual(activeTextEditor, [0, 5]); // restored to col 5
    });

    test("restore from cursor at end of original whitespace", async () => {
      setEmptyCursors(activeTextEditor, [0, 8]); // just before 'word2', offset 3
      await emulator.runCommand("cycleSpacing");
      await emulator.runCommand("cycleSpacing");
      await emulator.runCommand("cycleSpacing");

      assertTextEqual(activeTextEditor, "word1   word2");
      assertCursorsEqual(activeTextEditor, [0, 8]);
    });
  });

  suite("non-consecutive invocations reset the cycle", () => {
    test("moving cursor breaks the consecutive chain", async () => {
      activeTextEditor = await setupWorkspace("word1   word2");
      emulator = createEmulator(activeTextEditor);
      setEmptyCursors(activeTextEditor, [0, 7]);

      await emulator.runCommand("cycleSpacing"); // step 1: "word1 word2", cursor at 6
      await emulator.runCommand("cycleSpacing"); // step 2: "word1word2",  cursor at 5

      // Move cursor away to break the chain
      setEmptyCursors(activeTextEditor, [0, 4]);

      // Next invocation should be fresh step 1, NOT step 3
      await emulator.runCommand("cycleSpacing");

      // At col 4 ('1') in "word1word2": no surrounding whitespace → insert space
      assertTextEqual(activeTextEditor, "word word2");
      assertCursorsEqual(activeTextEditor, [0, 5]);
    });
  });

  suite("multi-cursor", () => {
    test("step 1 with two cursors in different whitespace regions", async () => {
      activeTextEditor = await setupWorkspace("a   b   c");
      emulator = createEmulator(activeTextEditor);
      // Two cursors, each in one of the whitespace regions
      setEmptyCursors(activeTextEditor, [0, 2], [0, 6]);

      await emulator.runCommand("cycleSpacing");

      assertTextEqual(activeTextEditor, "a b c");
      assertCursorsEqual(activeTextEditor, [0, 2], [0, 4]);
    });

    test("full cycle with two cursors", async () => {
      activeTextEditor = await setupWorkspace("a   b   c");
      emulator = createEmulator(activeTextEditor);
      setEmptyCursors(activeTextEditor, [0, 2], [0, 6]);

      await emulator.runCommand("cycleSpacing"); // step 1: "a b c"
      await emulator.runCommand("cycleSpacing"); // step 2: "abc"
      await emulator.runCommand("cycleSpacing"); // step 3: "a   b   c"

      assertTextEqual(activeTextEditor, "a   b   c");
      assertCursorsEqual(activeTextEditor, [0, 2], [0, 6]);
    });
  });
});
