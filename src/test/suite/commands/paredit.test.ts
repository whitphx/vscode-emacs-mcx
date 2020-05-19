import * as assert from "assert";
import * as vscode from "vscode";
import { Position, Range, TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { setEmptyCursors, setupWorkspace } from "../utils";

suite("paredit commands", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "(a b)";

    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  suite("forwardSexp", () => {
    test("without mark-mode", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      await emulator.runCommand("paredit.forwardSexp");

      assert.equal(activeTextEditor.selections.length, 1);
      assert.ok(activeTextEditor.selections[0].isEqual(new Range(new Position(0, 5), new Position(0, 5))));
    });

    test("with mark-mode", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      emulator.setMarkCommand();
      await emulator.runCommand("paredit.forwardSexp");

      assert.equal(activeTextEditor.selections.length, 1);
      assert.ok(activeTextEditor.selections[0].isEqual(new Range(new Position(0, 0), new Position(0, 5))));
    });
  });

  suite("backwardSexp", () => {
    test("without mark-mode", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]);

      await emulator.runCommand("paredit.backwardSexp");

      assert.equal(activeTextEditor.selections.length, 1);
      assert.ok(activeTextEditor.selections[0].isEqual(new Range(new Position(0, 0), new Position(0, 0))));
    });

    test("with mark-mode", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]);

      emulator.setMarkCommand();
      await emulator.runCommand("paredit.backwardSexp");

      assert.equal(activeTextEditor.selections.length, 1);
      assert.ok(activeTextEditor.selections[0].isEqual(new Range(new Position(0, 5), new Position(0, 0))));
    });
  });
});

suite("paredit commands with a long text that requires revealing", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "(" + "\n".repeat(1000) + ")";

    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  test("forwardSexp: the selection is revealed at the active cursor", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);
    emulator.setMarkCommand();

    await emulator.runCommand("paredit.forwardSexp");

    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(activeTextEditor.selections.length, 1);
    assert.equal(activeTextEditor.selection.active.line, 1000);
    const visibleRange = activeTextEditor.visibleRanges[0];
    assert.equal(visibleRange.end.line, 1000);
  });

  test("backwardSexp: the selection is revealed at the active cursor", async () => {
    setEmptyCursors(activeTextEditor, [1000, 1]);
    emulator.setMarkCommand();

    await emulator.runCommand("paredit.backwardSexp");

    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(activeTextEditor.selections.length, 1);
    assert.equal(activeTextEditor.selection.active.line, 0);
    const visibleRange = activeTextEditor.visibleRanges[0];
    assert.equal(visibleRange.start.line, 0);
  });
});

suite("paredit commands with prefix argument", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "(0 1 2 3 4 5 6 7 8 9)";

    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  test("forwardSexp", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]); // the right to `0`

    emulator.universalArgument();
    await emulator.type("2");
    await emulator.runCommand("paredit.forwardSexp");

    assert.equal(activeTextEditor.selections.length, 1);
    assert.ok(activeTextEditor.selections[0].isEqual(new Range(new Position(0, 6), new Position(0, 6))));
  });

  test("backwardSexp", async () => {
    setEmptyCursors(activeTextEditor, [0, 19]); // the left to `9`

    emulator.universalArgument();
    await emulator.type("2");
    await emulator.runCommand("paredit.backwardSexp");

    assert.equal(activeTextEditor.selections.length, 1);
    assert.ok(activeTextEditor.selections[0].isEqual(new Range(new Position(0, 15), new Position(0, 15))));
  });
});

suite("with semicolon", () => {
  const initialText = "(a ; b)\n(a ; b)\n(a ; b)";

  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  suite("with lisp (clojure)", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace(initialText, {
        language: "clojure",
      });
      emulator = new EmacsEmulator(activeTextEditor);
    });

    test("semicolon is treated as comment", async () => {
      setEmptyCursors(activeTextEditor, [0, 2]);

      await emulator.runCommand("paredit.forwardSexp");

      assert.equal(activeTextEditor.selections.length, 1);
      // The cursor at the beginning of the next line
      assert.ok(activeTextEditor.selections[0].isEqual(new Range(new Position(1, 0), new Position(1, 0))));
    });
  });

  suite("with other than lisp", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace(initialText, {
        language: "csharp",
      });
      emulator = new EmacsEmulator(activeTextEditor);
    });

    [0, 1, 2].forEach((line) => {
      test(`semicolon is treated as one entity (line ${line})`, async () => {
        setEmptyCursors(activeTextEditor, [line, 2]);

        await emulator.runCommand("paredit.forwardSexp");

        assert.equal(activeTextEditor.selections.length, 1);
        // The cursor is right to ";"
        assert.ok(activeTextEditor.selections[0].isEqual(new Range(new Position(line, 4), new Position(line, 4))));
      });
    });
  });
});
