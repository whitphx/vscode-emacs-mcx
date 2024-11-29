import * as vscode from "vscode";
import assert from "assert";
import sinon from "sinon";
import { Range, TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertCursorsEqual, assertSelectionsEqual, setEmptyCursors, setupWorkspace, cleanUpWorkspace } from "../utils";
import { Configuration } from "../../../configuration/configuration";

suite("moveBeginning/EndOfLine", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "x".repeat(1000) + "\n" + "a".repeat(1000) + "\n" + "x".repeat(1000);
    activeTextEditor = await setupWorkspace(initialText, { language: "markdown" }); // language=markdown sets wordWrap = true
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  suite("strictEmacsMove=true", () => {
    setup(() => {
      Configuration.instance.strictEmacsMove = true;
    });
    teardown(() => {
      Configuration.reload();
    });

    suite("moveBeginningOfLine", () => {
      test("normal", async () => {
        setEmptyCursors(activeTextEditor, [1, 1000]);
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [1, 0]);
      });

      test("with mark", async () => {
        setEmptyCursors(activeTextEditor, [1, 1000]);
        emulator.setMarkCommand();
        await emulator.runCommand("moveBeginningOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 1000, 1, 0));
      });
    });

    suite("moveEndOfLine", () => {
      test("normal", async () => {
        setEmptyCursors(activeTextEditor, [1, 0]);
        await emulator.runCommand("moveEndOfLine");
        assertCursorsEqual(activeTextEditor, [1, 1000]);
      });

      test("with mark", async () => {
        setEmptyCursors(activeTextEditor, [1, 0]);
        emulator.setMarkCommand();
        await emulator.runCommand("moveEndOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 0, 1, 1000));
      });
    });
  });

  suite("strictEmacsMove=false", () => {
    let wrappedLineWidth: number;

    setup(async () => {
      Configuration.instance.strictEmacsMove = false;

      // Get wrapped line width
      setEmptyCursors(activeTextEditor, [1, 0]);
      await vscode.commands.executeCommand<void>("cursorMove", {
        to: "wrappedLineEnd",
        value: 1,
      });
      wrappedLineWidth = activeTextEditor.selection.active.character;
    });
    teardown(() => {
      Configuration.reload();
    });

    suite("moveBeginningOfLine", () => {
      let lastWrappedLineStart: number;
      setup(() => {
        lastWrappedLineStart = 1000 - (1000 % wrappedLineWidth);
      });

      test("normal", async () => {
        setEmptyCursors(activeTextEditor, [1, 1000]);
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [1, lastWrappedLineStart]);
      });

      test("with mark", async () => {
        setEmptyCursors(activeTextEditor, [1, 1000]);
        emulator.setMarkCommand();
        await emulator.runCommand("moveBeginningOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 1000, 1, lastWrappedLineStart));
      });
    });

    suite("moveEndOfLine", () => {
      test("normal", async () => {
        setEmptyCursors(activeTextEditor, [1, 0]);
        await emulator.runCommand("moveEndOfLine");
        assertCursorsEqual(activeTextEditor, [1, wrappedLineWidth]);
      });

      test("with mark", async () => {
        setEmptyCursors(activeTextEditor, [1, 0]);
        emulator.setMarkCommand();
        await emulator.runCommand("moveEndOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 0, 1, wrappedLineWidth));
      });
    });
  });
});

suite("nextLine/previousLine", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "x".repeat(1000) + "\n" + "a".repeat(1000) + "\n" + "x".repeat(1000);
    activeTextEditor = await setupWorkspace(initialText, { language: "markdown" }); // language=markdown sets wordWrap = true
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  suite("lineMoveVisual=true", () => {
    let wrappedLineWidth: number;

    setup(async () => {
      Configuration.instance.lineMoveVisual = true;

      // Get wrapped line width
      setEmptyCursors(activeTextEditor, [1, 0]);
      await vscode.commands.executeCommand<void>("cursorMove", {
        to: "wrappedLineEnd",
        value: 1,
      });
      wrappedLineWidth = activeTextEditor.selection.active.character;
    });
    teardown(() => {
      Configuration.reload();
    });

    suite("nextLine", () => {
      test("normal", async () => {
        setEmptyCursors(activeTextEditor, [1, 0]);
        await emulator.runCommand("nextLine");
        assertCursorsEqual(activeTextEditor, [1, wrappedLineWidth]);
      });

      test("with mark", async () => {
        setEmptyCursors(activeTextEditor, [1, 0]);
        emulator.setMarkCommand();
        await emulator.runCommand("nextLine");
        assertSelectionsEqual(activeTextEditor, [1, 0, 1, wrappedLineWidth]);
      });
    });

    suite("previousLine", () => {
      test("normal", async () => {
        setEmptyCursors(activeTextEditor, [1, wrappedLineWidth]);
        await emulator.runCommand("previousLine");
        assertCursorsEqual(activeTextEditor, [1, 0]);
      });

      test("with mark", async () => {
        setEmptyCursors(activeTextEditor, [1, wrappedLineWidth]);
        emulator.setMarkCommand();
        await emulator.runCommand("previousLine");
        assertSelectionsEqual(activeTextEditor, [1, wrappedLineWidth, 1, 0]);
      });
    });
  });

  suite("lineMoveVisual=false", () => {
    setup(() => {
      Configuration.instance.lineMoveVisual = false;
    });
    teardown(() => {
      Configuration.reload();
    });

    suite("nextLine", () => {
      test("normal", async () => {
        setEmptyCursors(activeTextEditor, [1, 0]);
        await emulator.runCommand("nextLine");
        assertCursorsEqual(activeTextEditor, [2, 0]);
      });

      test("with mark", async () => {
        setEmptyCursors(activeTextEditor, [1, 0]);
        emulator.setMarkCommand();
        await emulator.runCommand("nextLine");
        assertSelectionsEqual(activeTextEditor, [1, 0, 2, 0]);
      });
    });

    suite("previousLine", () => {
      test("normal", async () => {
        setEmptyCursors(activeTextEditor, [1, 0]);
        await emulator.runCommand("previousLine");
        assertCursorsEqual(activeTextEditor, [0, 0]);
      });

      test("with mark", async () => {
        setEmptyCursors(activeTextEditor, [1, 0]);
        emulator.setMarkCommand();
        await emulator.runCommand("previousLine");
        assertSelectionsEqual(activeTextEditor, [1, 0, 0, 0]);
      });
    });
  });
});

suite("scroll-up/down-command", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;
  let visibleRange: Range;
  let pageLines: number;

  setup(async () => {
    const initialText = "a\n".repeat(400);
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);

    await vscode.commands.executeCommand("editorScroll", { to: "down", by: "page" });

    const _visibleRange = activeTextEditor.visibleRanges[0];
    if (_visibleRange == null) {
      throw new Error("No visible range available.");
    }
    visibleRange = _visibleRange;
    pageLines = visibleRange.end.line - visibleRange.start.line;
  });
  teardown(async () => {
    sinon.restore();
    await cleanUpWorkspace();
  });

  suite("scroll-up-command", () => {
    test("it delegates to the cursorPageDown command", async () => {
      sinon.spy(vscode.commands, "executeCommand");
      await emulator.runCommand("scrollUpCommand");
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      assert(vscode.commands.executeCommand.calledWithExactly("cursorPageDown"), "cursorPageDown is not called");
      sinon.restore();
    });

    test("it scrolls one page if the cursor remains in the visible range without cursor move with strictEmacsMove = true", async () => {
      Configuration.instance.strictEmacsMove = true;

      const lastVisibleLine = visibleRange.end.line;
      setEmptyCursors(activeTextEditor, [lastVisibleLine, 0]);

      const initVisibleStartLine = visibleRange.start.line;

      await emulator.runCommand("scrollUpCommand");

      assertCursorsEqual(activeTextEditor, [lastVisibleLine, 0]);
      assert.ok(
        (activeTextEditor.visibleRanges[0]?.start.line as number) >= initVisibleStartLine + pageLines - 1,
        "Expected the visible range has been scrolled one page",
      );

      Configuration.reload();
    });

    test("it scrolls with the specified number of lines by the prefix argument", async () => {
      const middleVisibleLine = Math.floor((visibleRange.start.line + visibleRange.end.line) / 2);
      setEmptyCursors(activeTextEditor, [middleVisibleLine, 0]);

      const initVisibleStartLine = visibleRange.start.line;

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(12);
      await emulator.runCommand("scrollUpCommand");

      assert.equal(
        activeTextEditor.visibleRanges[0]?.start.line,
        initVisibleStartLine + 12,
        "Expected the visibleRange has been scrolled 2 lines",
      );
      assertCursorsEqual(activeTextEditor, [middleVisibleLine, 0]);
    });

    test("it scrolls with the specified number of lines by the prefix argument and moves the cursor if it goes outside the visible range", async () => {
      setEmptyCursors(activeTextEditor, [visibleRange.start.line, 0]); // This line will be outside the visible range after scrolling.

      const initVisibleStartLine = visibleRange.start.line;

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(12);
      await emulator.runCommand("scrollUpCommand");

      assert.equal(
        activeTextEditor.visibleRanges[0]?.start.line,
        initVisibleStartLine + 12,
        "Expected the visibleRange has been scrolled 2 lines",
      );
      assertCursorsEqual(activeTextEditor, [activeTextEditor.visibleRanges[0]?.start.line as number, 0]);
    });

    test("it scrolls with the specified number of lines by the prefix argument and moves the cursor if it goes outside the visible range, keeping the selection", async () => {
      setEmptyCursors(activeTextEditor, [visibleRange.start.line, 0]); // This line will be outside the visible range after scrolling.

      const initVisibleStartLine = visibleRange.start.line;
      const initCursorPosition = activeTextEditor.selection.active;

      emulator.setMarkCommand();

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(12);
      await emulator.runCommand("scrollUpCommand");

      assert.equal(
        activeTextEditor.visibleRanges[0]?.start.line,
        initVisibleStartLine + 12,
        "Expected the visibleRange has been scrolled 2 lines",
      );
      assertSelectionsEqual(activeTextEditor, [
        initCursorPosition.line,
        initCursorPosition.character,
        activeTextEditor.visibleRanges[0]?.start.line as number,
        0,
      ]);
    });
  });

  suite("scroll-down-command", () => {
    test("it delegates to the cursorPageUp command", async () => {
      sinon.spy(vscode.commands, "executeCommand");
      await emulator.runCommand("scrollDownCommand");
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      assert(vscode.commands.executeCommand.calledWithExactly("cursorPageUp"), "cursorPageUp is not called");
      sinon.restore();
    });

    test("it scrolls one page without cursor move if the cursor remains in the visible range with strictEmacsMove = true", async () => {
      Configuration.instance.strictEmacsMove = true;

      const firstVisibleLine = visibleRange.start.line;
      setEmptyCursors(activeTextEditor, [firstVisibleLine, 0]);

      const initVisibleStartLine = visibleRange.start.line;

      await emulator.runCommand("scrollDownCommand");

      assertCursorsEqual(activeTextEditor, [firstVisibleLine, 0]);
      assert.ok(
        (activeTextEditor.visibleRanges[0]?.start.line as number) <= initVisibleStartLine - pageLines + 1,
        "Expected the visible range has been scrolled one page",
      );

      Configuration.reload();
    });

    test("it scrolls with the specified number of lines by the prefix argument", async () => {
      const middleVisibleLine = Math.floor((visibleRange.start.line + visibleRange.end.line) / 2);
      setEmptyCursors(activeTextEditor, [middleVisibleLine, 0]);

      const initVisibleStartLine = visibleRange.start.line;

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(12);
      await emulator.runCommand("scrollDownCommand");

      assert.equal(
        activeTextEditor.visibleRanges[0]?.start.line,
        initVisibleStartLine - 12,
        "Expected the visibleRange has been scrolled 2 lines",
      );
      assertCursorsEqual(activeTextEditor, [middleVisibleLine, 0]);
    });

    test("it scrolls with the specified number of lines by the prefix argument and moves the cursor if it goes outside the visible range", async () => {
      setEmptyCursors(activeTextEditor, [visibleRange.end.line, 0]); // This line will be outside the visible range after scrolling.

      const initVisibleStartLine = visibleRange.start.line;

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(12);
      await emulator.runCommand("scrollDownCommand");

      assert.equal(
        activeTextEditor.visibleRanges[0]?.start.line,
        initVisibleStartLine - 12,
        "Expected the visibleRange has been scrolled 2 lines",
      );
      assertCursorsEqual(activeTextEditor, [activeTextEditor.visibleRanges[0]?.end.line as number, 0]);
    });

    test("it scrolls with the specified number of lines by the prefix argument and moves the cursor if it goes outside the visible range, keeping the selection", async () => {
      setEmptyCursors(activeTextEditor, [visibleRange.end.line, 0]); // This line will be outside the visible range after scrolling.

      const initVisibleStartLine = visibleRange.start.line;
      const initCursorPosition = activeTextEditor.selection.active;

      emulator.setMarkCommand();

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(12);
      await emulator.runCommand("scrollDownCommand");

      assert.equal(
        activeTextEditor.visibleRanges[0]?.start.line,
        initVisibleStartLine - 12,
        "Expected the visibleRange has been scrolled 2 lines",
      );
      assertSelectionsEqual(activeTextEditor, [
        initCursorPosition.line,
        initCursorPosition.character,
        activeTextEditor.visibleRanges[0]?.end.line as number,
        0,
      ]);
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

  teardown(cleanUpWorkspace);

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

  teardown(cleanUpWorkspace);

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

  teardown(cleanUpWorkspace);

  test("beginningOfBuffer sets a new mark", async () => {
    setEmptyCursors(activeTextEditor, [101, 1]);

    await emulator.runCommand("beginningOfBuffer");

    assert.notStrictEqual(activeTextEditor.selection.active.line, 101);

    emulator.popMark();

    assertCursorsEqual(activeTextEditor, [101, 1]);
  });

  test("endOfBuffer sets a new mark", async () => {
    setEmptyCursors(activeTextEditor, [0, 1]);

    await emulator.runCommand("endOfBuffer");

    assert.notStrictEqual(activeTextEditor.selection.active.line, 0);

    emulator.popMark();

    assertCursorsEqual(activeTextEditor, [0, 1]);
  });
});
