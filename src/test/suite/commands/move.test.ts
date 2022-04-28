import * as vscode from "vscode";
import assert from "assert";
import { Range, TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertCursorsEqual, assertSelectionsEqual, setEmptyCursors, setupWorkspace } from "../utils";
import { Configuration } from "../../../configuration/configuration";

suite("moveBeginning/EndOfLine", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "x".repeat(1000) + "\n" + "a".repeat(1000) + "\n" + "x".repeat(1000);
    activeTextEditor = await setupWorkspace(initialText, { language: "markdown" }); // language=markdown sets wordWrap = true
    emulator = new EmacsEmulator(activeTextEditor);
  });

  suite("strictEmacsMove=true", () => {
    setup(() => {
      Configuration.instance.strictEmacsMove = true;
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

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(2);
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

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(2);
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
