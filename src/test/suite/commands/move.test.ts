import * as vscode from "vscode";
import * as assert from "assert";
import * as expect from "expect";
import { Range, TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertCursorsEqual, setEmptyCursors, setupWorkspace } from "../utils";

suite("scroll-up/down-command", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;
  let visibleRange: Range;
  let pageLines: number;

  setup(async () => {
    const initialText = "a\n".repeat(100);
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);

    visibleRange = activeTextEditor.visibleRanges[0];
    pageLines = visibleRange.end.line - visibleRange.start.line;
  });

  suite("scroll-up-command", () => {
    test("it scrolls one page", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]); // The first line

      await emulator.runCommand("scrollUpCommand");

      assert.ok(activeTextEditor.selection.start.line >= pageLines - 1);
    });

    test("it scrolls with the speficied number of lines by the prefix argument", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]); // The first line

      emulator.universalArgument();
      await emulator.universalArgumentDigit(2);
      await emulator.runCommand("scrollUpCommand");

      assertCursorsEqual(activeTextEditor, [2, 0]); // 2 lines down
    });
  });

  suite("scroll-down-command", () => {
    test("it scrolls one page", async () => {
      const startLine = pageLines * 2;
      setEmptyCursors(activeTextEditor, [startLine, 0]);

      await emulator.runCommand("scrollDownCommand");

      assert.ok(activeTextEditor.selection.start.line <= startLine - pageLines + 1);
    });

    test("it scrolls with the speficied number of lines by the prefix argument", async () => {
      setEmptyCursors(activeTextEditor, [10, 0]);

      emulator.universalArgument();
      await emulator.universalArgumentDigit(2);
      await emulator.runCommand("scrollDownCommand");

      assertCursorsEqual(activeTextEditor, [8, 0]); // 2 lines up
    });
  });
});

suite("forwardParagraph", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = `aaa
bbb

ccc
ddd

eee
fff`;
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  test("it moves to the next end of the paragraph", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("forwardParagraph");
    assertCursorsEqual(activeTextEditor, [2, 0]);
    await emulator.runCommand("forwardParagraph");
    assertCursorsEqual(activeTextEditor, [5, 0]);
    await emulator.runCommand("forwardParagraph");
    assertCursorsEqual(activeTextEditor, [7, 3]);
  });
});

suite("backwardParagraph", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = `aaa
bbb

ccc
ddd

eee
fff`;
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  test("it moves to the previous beginning of the paragraph", async () => {
    setEmptyCursors(activeTextEditor, [7, 3]);
    await emulator.runCommand("backwardParagraph");
    assertCursorsEqual(activeTextEditor, [5, 0]);
    await emulator.runCommand("backwardParagraph");
    assertCursorsEqual(activeTextEditor, [2, 0]);
    await emulator.runCommand("backwardParagraph");
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });
});

suite("beginning/endOfBuffer", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "aaa" + "\n".repeat(100) + "bbb";
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  test("beginningOfBuffer sets a new mark", async () => {
    setEmptyCursors(activeTextEditor, [101, 1]);

    await emulator.runCommand("beginningOfBuffer");

    expect(activeTextEditor.selection.active.line).not.toEqual(101);

    emulator.popMark();

    assertCursorsEqual(activeTextEditor, [101, 1]);
  });

  test("endOfBuffer sets a new mark", async () => {
    setEmptyCursors(activeTextEditor, [0, 1]);

    await emulator.runCommand("endOfBuffer");

    expect(activeTextEditor.selection.active.line).not.toEqual(0);

    emulator.popMark();

    assertCursorsEqual(activeTextEditor, [0, 1]);
  });
});
