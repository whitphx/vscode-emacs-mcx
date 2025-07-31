import * as vscode from "vscode";
import assert from "assert";
import sinon from "sinon";
import { TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertCursorsEqual, assertSelectionsEqual, setEmptyCursors, setupWorkspace, cleanUpWorkspace } from "../utils";
import { Configuration } from "../../../configuration/configuration";

suite("moveBeginning/EndOfLine", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  const indentLength = 4;

  setup(async () => {
    const initialText =
      "x".repeat(1000) + "\n" + "a".repeat(1000) + "\n" + " ".repeat(indentLength) + "b".repeat(1000 - indentLength);
    activeTextEditor = await setupWorkspace(initialText, { language: "markdown" }); // language=markdown sets wordWrap = true
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  suite("moveBeginning/EndOfLineBehavior = 'emacs', lineMoveVisual=false", () => {
    setup(() => {
      Configuration.instance.moveBeginningOfLineBehavior = "emacs";
      Configuration.instance.moveEndOfLineBehavior = "emacs";
      Configuration.instance.lineMoveVisual = false;
    });
    teardown(() => {
      Configuration.reload();
    });

    suite("moveBeginningOfLine", () => {
      test("normal", async () => {
        setEmptyCursors(activeTextEditor, [1, 1000]);
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [1, 0]);
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [1, 0]); // The cursor stays at the beginning of the line
      });

      test("with mark", async () => {
        setEmptyCursors(activeTextEditor, [1, 1000]);
        await emulator.setMarkCommand();
        await emulator.runCommand("moveBeginningOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 1000, 1, 0));
        await emulator.runCommand("moveBeginningOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 1000, 1, 0)); // The cursor stays at the beginning of the line
      });

      test("ignore indentation", async () => {
        setEmptyCursors(activeTextEditor, [2, 1000]);
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [2, 0]);
      });
    });

    suite("moveEndOfLine", () => {
      test("normal", async () => {
        setEmptyCursors(activeTextEditor, [1, 0]);
        await emulator.runCommand("moveEndOfLine");
        assertCursorsEqual(activeTextEditor, [1, 1000]);
        await emulator.runCommand("moveEndOfLine");
        assertCursorsEqual(activeTextEditor, [1, 1000]); // The cursor stays at the end of the line
      });

      test("with mark", async () => {
        setEmptyCursors(activeTextEditor, [1, 0]);
        await emulator.setMarkCommand();
        await emulator.runCommand("moveEndOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 0, 1, 1000));
        await emulator.runCommand("moveEndOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 0, 1, 1000)); // The cursor stays at the end of the line
      });
    });
  });

  suite("moveBeginning/EndOfLineBehavior = 'emacs', lineMoveVisual=true", () => {
    let wrappedLineWidth: number;

    setup(async () => {
      Configuration.instance.moveBeginningOfLineBehavior = "emacs";
      Configuration.instance.moveEndOfLineBehavior = "emacs";
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

    suite("moveBeginningOfLine", () => {
      let lastWrappedLineStart: number;
      setup(() => {
        lastWrappedLineStart = 1000 - (1000 % wrappedLineWidth);
      });

      test("normal", async () => {
        setEmptyCursors(activeTextEditor, [1, 1000]);
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [1, lastWrappedLineStart]);
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [1, lastWrappedLineStart]); // The cursor stays at the beginning of the wrapped line
      });

      test("with mark", async () => {
        setEmptyCursors(activeTextEditor, [1, 1000]);
        await emulator.setMarkCommand();
        await emulator.runCommand("moveBeginningOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 1000, 1, lastWrappedLineStart));
        await emulator.runCommand("moveBeginningOfLine");
        assertSelectionsEqual(
          activeTextEditor,
          new vscode.Selection(1, 1000, 1, lastWrappedLineStart), // The cursor stays at the beginning of the wrapped line
        );
      });

      test("ignore indentation", async () => {
        setEmptyCursors(activeTextEditor, [2, wrappedLineWidth - 1]);
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [2, 0]);
      });
    });

    suite("moveEndOfLine", () => {
      test("normal", async () => {
        setEmptyCursors(activeTextEditor, [1, 0]);
        await emulator.runCommand("moveEndOfLine");
        assertCursorsEqual(activeTextEditor, [1, wrappedLineWidth]);
        await emulator.runCommand("moveEndOfLine");
        assertCursorsEqual(activeTextEditor, [1, wrappedLineWidth * 2]);
      });

      test("with mark", async () => {
        setEmptyCursors(activeTextEditor, [1, 0]);
        await emulator.setMarkCommand();
        await emulator.runCommand("moveEndOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 0, 1, wrappedLineWidth));
        await emulator.runCommand("moveEndOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 0, 1, wrappedLineWidth * 2));
      });
    });
  });

  suite("moveBeginning/EndOfLineBehavior = 'vscode', lineMoveVisual = true", () => {
    let wrappedLineWidth: number;

    setup(async () => {
      Configuration.instance.moveBeginningOfLineBehavior = "vscode";
      Configuration.instance.moveEndOfLineBehavior = "vscode";
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

    suite("moveBeginningOfLine", () => {
      let lastWrappedLineStart: number;
      setup(() => {
        lastWrappedLineStart = 1000 - (1000 % wrappedLineWidth);
      });

      test("normal", async () => {
        setEmptyCursors(activeTextEditor, [1, 1000]);
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [1, lastWrappedLineStart]);
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [1, 0]); // The cursor moves to the beginning of the line
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [1, 0]); // The cursor stays at the beginning of the line
      });

      test("with mark", async () => {
        setEmptyCursors(activeTextEditor, [1, 1000]);
        await emulator.setMarkCommand();
        await emulator.runCommand("moveBeginningOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 1000, 1, lastWrappedLineStart));
        await emulator.runCommand("moveBeginningOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 1000, 1, 0)); // The cursor moves to the beginning of the line
        await emulator.runCommand("moveBeginningOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 1000, 1, 0)); // The cursor stays at the beginning of the line
      });

      test("taking care of indentation", async () => {
        setEmptyCursors(activeTextEditor, [2, wrappedLineWidth + 1]);
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [2, wrappedLineWidth]); // Move to the beginning of the wrapped line
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [2, indentLength]); // Move to the first character of the line
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [2, 0]); // Move to the beginning of the line
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [2, indentLength]); // Move to the first character of the line again
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
        await emulator.setMarkCommand();
        await emulator.runCommand("moveEndOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 0, 1, wrappedLineWidth));
      });
    });
  });

  suite("moveBeginning/EndOfLineBehavior = 'vscode', lineMoveVisual = false", () => {
    setup(() => {
      Configuration.instance.moveBeginningOfLineBehavior = "vscode";
      Configuration.instance.moveEndOfLineBehavior = "vscode";
      Configuration.instance.lineMoveVisual = false;
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
        await emulator.setMarkCommand();
        await emulator.runCommand("moveBeginningOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 1000, 1, 0));
      });

      test("taking care of indentation", async () => {
        setEmptyCursors(activeTextEditor, [2, 1000]);
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [2, indentLength]); // Move to the first character of the line
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [2, 0]); // Move to the beginning of the line
        await emulator.runCommand("moveBeginningOfLine");
        assertCursorsEqual(activeTextEditor, [2, indentLength]); // Move to the first character of the line again
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
        await emulator.setMarkCommand();
        await emulator.runCommand("moveEndOfLine");
        assertSelectionsEqual(activeTextEditor, new vscode.Selection(1, 0, 1, 1000));
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
        await emulator.setMarkCommand();
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
        await emulator.setMarkCommand();
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
        await emulator.setMarkCommand();
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
        await emulator.setMarkCommand();
        await emulator.runCommand("previousLine");
        assertSelectionsEqual(activeTextEditor, [1, 0, 0, 0]);
      });
    });
  });
});

suite("scroll-up/down-command", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "a\n".repeat(400);
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);

    await vscode.commands.executeCommand("editorScroll", { to: "down", by: "page", value: 2 });
  });
  teardown(async () => {
    sinon.restore();
    await cleanUpWorkspace();
  });

  function getVisibleRangeInfo(): { startLine: number; endLine: number; visibleLineCount: number } {
    const visibleRanges = activeTextEditor.visibleRanges;
    if (visibleRanges.length === 0) {
      throw new Error("No visible range available.");
    }

    let visibleLineCount = 0;
    for (const range of visibleRanges) {
      visibleLineCount += range.end.line - range.start.line + 1;
    }

    return {
      startLine: visibleRanges[0]!.start.line,
      endLine: visibleRanges[visibleRanges.length - 1]!.end.line,
      visibleLineCount,
    };
  }

  suite("scroll-up-command", () => {
    test("it delegates to the cursorPageDown command when scrollUpCommandBehavior = 'vscode'", async () => {
      Configuration.instance.scrollUpCommandBehavior = "vscode";

      const spiedExecuteCommand = sinon.spy(vscode.commands, "executeCommand");

      await emulator.runCommand("scrollUpCommand");
      assert(spiedExecuteCommand.calledWithExactly("cursorPageDown"), "cursorPageDown is not called");

      sinon.restore();
    });

    test("it scrolls one page if the cursor remains in the visible range without cursor move with scrollUpCommandBehavior = 'emacs'", async () => {
      Configuration.instance.scrollUpCommandBehavior = "emacs";

      const { startLine, endLine, visibleLineCount: pageLines } = getVisibleRangeInfo();

      setEmptyCursors(activeTextEditor, [endLine, 0]);

      await emulator.runCommand("scrollUpCommand");

      assertCursorsEqual(activeTextEditor, [endLine, 0]);
      assert.ok(
        getVisibleRangeInfo().startLine >= startLine + pageLines - 2, // -2 for margin
        "Expected the visible range has been scrolled one page",
      );

      Configuration.reload();
    });

    test("it scrolls with the specified number of lines by the prefix argument", async () => {
      const { startLine, endLine } = getVisibleRangeInfo();

      const middleVisibleLine = Math.floor((startLine + endLine) / 2);
      setEmptyCursors(activeTextEditor, [middleVisibleLine, 0]);

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(12);
      await emulator.runCommand("scrollUpCommand");

      assert.equal(
        getVisibleRangeInfo().startLine,
        startLine + 12,
        "Expected the visibleRange has been scrolled 12 lines",
      );
      assertCursorsEqual(activeTextEditor, [middleVisibleLine, 0]);
    });

    test("it scrolls with the specified number of lines by the prefix argument and moves the cursor if it goes outside the visible range", async () => {
      const { startLine } = getVisibleRangeInfo();

      setEmptyCursors(activeTextEditor, [startLine, 0]); // This line will be outside the visible range after scrolling.

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(12);
      await emulator.runCommand("scrollUpCommand");

      assert.equal(
        getVisibleRangeInfo().startLine,
        startLine + 12,
        "Expected the visibleRange has been scrolled 2 lines",
      );
      assertCursorsEqual(activeTextEditor, [getVisibleRangeInfo().startLine, 0]);
    });

    test("it scrolls with the specified number of lines by the prefix argument and moves the cursor if it goes outside the visible range, keeping the selection", async () => {
      const { startLine } = getVisibleRangeInfo();

      setEmptyCursors(activeTextEditor, [startLine, 0]); // This line will be outside the visible range after scrolling.

      const initCursorPosition = activeTextEditor.selection.active;

      await emulator.setMarkCommand();

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(12);
      await emulator.runCommand("scrollUpCommand");

      assert.equal(
        getVisibleRangeInfo().startLine,
        startLine + 12,
        "Expected the visibleRange has been scrolled 2 lines",
      );
      assertSelectionsEqual(activeTextEditor, [
        initCursorPosition.line,
        initCursorPosition.character,
        getVisibleRangeInfo().startLine,
        0,
      ]);
    });
  });

  suite("scroll-down-command", () => {
    test("it delegates to the cursorPageUp command when scrollDownCommandBehavior = 'vscode'", async () => {
      Configuration.instance.scrollDownCommandBehavior = "vscode";

      const spiedExecuteCommand = sinon.spy(vscode.commands, "executeCommand");

      await emulator.runCommand("scrollDownCommand");
      assert(spiedExecuteCommand.calledWithExactly("cursorPageUp"), "cursorPageUp is not called");

      sinon.restore();
    });

    test("it scrolls one page without cursor move if the cursor remains in the visible range with scrollDownCommandBehavior = 'emacs'", async () => {
      Configuration.instance.scrollDownCommandBehavior = "emacs";

      const { startLine, visibleLineCount: pageLines } = getVisibleRangeInfo();

      setEmptyCursors(activeTextEditor, [startLine, 0]);

      await emulator.runCommand("scrollDownCommand");

      assertCursorsEqual(activeTextEditor, [startLine, 0]);
      assert.ok(
        getVisibleRangeInfo().startLine <= startLine - pageLines + 2, // +2 for a margin
        "Expected the visible range has been scrolled one page",
      );

      Configuration.reload();
    });

    test("it scrolls with the specified number of lines by the prefix argument", async () => {
      const { startLine, endLine } = getVisibleRangeInfo();

      const middleVisibleLine = Math.floor((startLine + endLine) / 2);
      setEmptyCursors(activeTextEditor, [middleVisibleLine, 0]);

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(12);
      await emulator.runCommand("scrollDownCommand");

      assert.equal(
        getVisibleRangeInfo().startLine,
        startLine - 12,
        "Expected the visibleRange has been scrolled 2 lines",
      );
      assertCursorsEqual(activeTextEditor, [middleVisibleLine, 0]);
    });

    test("it scrolls with the specified number of lines by the prefix argument and moves the cursor if it goes outside the visible range", async () => {
      const { startLine, endLine } = getVisibleRangeInfo();
      setEmptyCursors(activeTextEditor, [endLine, 0]); // This line will be outside the visible range after scrolling.

      const initVisibleStartLine = startLine;

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(12);
      await emulator.runCommand("scrollDownCommand");

      assert.equal(
        getVisibleRangeInfo().startLine,
        initVisibleStartLine - 12,
        "Expected the visibleRange has been scrolled 12 lines",
      );
      assertCursorsEqual(activeTextEditor, [getVisibleRangeInfo().endLine, 0]);
    });

    test("it scrolls with the specified number of lines by the prefix argument and moves the cursor if it goes outside the visible range, keeping the selection", async () => {
      const { startLine, endLine } = getVisibleRangeInfo();

      setEmptyCursors(activeTextEditor, [endLine, 0]); // This line will be outside the visible range after scrolling.

      const initCursorPosition = activeTextEditor.selection.active;

      await emulator.setMarkCommand();

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(12);
      await emulator.runCommand("scrollDownCommand");

      assert.equal(
        getVisibleRangeInfo().startLine,
        startLine - 12,
        "Expected the visibleRange has been scrolled 12 lines",
      );
      assertSelectionsEqual(activeTextEditor, [
        initCursorPosition.line,
        initCursorPosition.character,
        getVisibleRangeInfo().endLine,
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
