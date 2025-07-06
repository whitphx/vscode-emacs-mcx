import * as vscode from "vscode";
import assert from "assert";
import { TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { calcTargetLine, calcMiddleLine } from "../../../commands/move";
import {
  assertCursorsEqual,
  assertSelectionsEqual,
  setEmptyCursors,
  setupWorkspace,
  cleanUpWorkspace,
  clearTextEditor,
  delay,
} from "../utils";

suite("calcTargetLine", () => {
  test("calculates target line for single range", () => {
    const ranges = [new vscode.Range(10, 0, 20, 0)];

    assert.equal(calcTargetLine(ranges, 0), 10);
    assert.equal(calcTargetLine(ranges, 5), 15);
    assert.equal(calcTargetLine(ranges, 10), 20);
    assert.equal(calcTargetLine(ranges, 15), undefined);
  });

  test("calculates target line for multiple ranges", () => {
    const ranges = [
      new vscode.Range(10, 0, 15, 0), // 6 lines (10-15)
      new vscode.Range(20, 0, 25, 0), // 6 lines (20-25)
    ];

    // First range
    assert.equal(calcTargetLine(ranges, 0), 10);
    assert.equal(calcTargetLine(ranges, 3), 13);
    assert.equal(calcTargetLine(ranges, 5), 15);

    // Second range
    assert.equal(calcTargetLine(ranges, 6), 20);
    assert.equal(calcTargetLine(ranges, 9), 23);
    assert.equal(calcTargetLine(ranges, 11), 25);

    // Out of bounds
    assert.equal(calcTargetLine(ranges, 12), undefined);
  });

  test("handles empty ranges array", () => {
    assert.equal(calcTargetLine([], 0), undefined);
    assert.equal(calcTargetLine([], 5), undefined);
  });

  test("handles single line ranges", () => {
    const ranges = [new vscode.Range(10, 0, 10, 0)];

    assert.equal(calcTargetLine(ranges, 0), 10);
    assert.equal(calcTargetLine(ranges, 1), undefined);
  });
});

suite("moveToWindowLineTopBottom", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "line\n".repeat(100);
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);

    // Position cursor in the middle of the document and scroll to make it visible
    setEmptyCursors(activeTextEditor, [50, 0]);
    await vscode.commands.executeCommand("revealLine", { lineNumber: 50, at: "center" });
  });

  teardown(cleanUpWorkspace);

  suite("cycling behavior without prefix argument", () => {
    test("first call moves to middle of window", async () => {
      // Start at a line that's not in the middle
      setEmptyCursors(activeTextEditor, [45, 0]);

      await emulator.runCommand("moveToWindowLineTopBottom");

      const expectedMiddleLine = calcMiddleLine(activeTextEditor.visibleRanges);
      if (expectedMiddleLine == null) {
        throw new Error("No visible ranges available to calculate middle line");
      }

      assertCursorsEqual(activeTextEditor, [expectedMiddleLine, 0]);
    });

    test("second call moves to top of window", async () => {
      // First call to middle
      await emulator.runCommand("moveToWindowLineTopBottom");

      // Second call should move to top
      await emulator.runCommand("moveToWindowLineTopBottom");

      const firstVisibleRange = activeTextEditor.visibleRanges[0];
      if (!firstVisibleRange) {
        throw new Error("No visible range available");
      }

      assertCursorsEqual(activeTextEditor, [firstVisibleRange.start.line, 0]);
    });

    test("third call moves to bottom of window", async () => {
      // First call to middle
      await emulator.runCommand("moveToWindowLineTopBottom");
      // Second call to top
      await emulator.runCommand("moveToWindowLineTopBottom");
      // Third call should move to bottom
      await emulator.runCommand("moveToWindowLineTopBottom");

      const lastVisibleRange = activeTextEditor.visibleRanges[activeTextEditor.visibleRanges.length - 1];
      if (!lastVisibleRange) {
        throw new Error("No visible range available");
      }

      assertCursorsEqual(activeTextEditor, [lastVisibleRange.end.line, 0]);
    });

    test("fourth call cycles back to middle", async () => {
      // Complete one full cycle
      await emulator.runCommand("moveToWindowLineTopBottom"); // middle
      await emulator.runCommand("moveToWindowLineTopBottom"); // top
      await emulator.runCommand("moveToWindowLineTopBottom"); // bottom
      await emulator.runCommand("moveToWindowLineTopBottom"); // back to middle

      const expectedMiddleLine = calcMiddleLine(activeTextEditor.visibleRanges);
      if (expectedMiddleLine == null) {
        throw new Error("No visible ranges available to calculate middle line");
      }

      assertCursorsEqual(activeTextEditor, [expectedMiddleLine, 0]);
    });
  });

  suite("prefix argument behavior", () => {
    test("positive prefix argument moves from top of window", async () => {
      const firstVisibleRange = activeTextEditor.visibleRanges[0];
      if (!firstVisibleRange) {
        throw new Error("No visible range available");
      }

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(3);
      await emulator.runCommand("moveToWindowLineTopBottom");

      const expectedLine = firstVisibleRange.start.line + 3;
      assertCursorsEqual(activeTextEditor, [expectedLine, 0]);
    });

    test("zero prefix argument moves to top of window", async () => {
      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(0);
      await emulator.runCommand("moveToWindowLineTopBottom");

      const firstVisibleRange = activeTextEditor.visibleRanges[0];
      if (firstVisibleRange) {
        assertCursorsEqual(activeTextEditor, [firstVisibleRange.start.line, 0]);
      }
    });

    test("negative prefix argument moves from bottom of window", async () => {
      const lastVisibleRange = activeTextEditor.visibleRanges[activeTextEditor.visibleRanges.length - 1];
      if (!lastVisibleRange) {
        throw new Error("No visible range available");
      }

      await emulator.universalArgument();
      await emulator.negativeArgument();
      await emulator.subsequentArgumentDigit(2);
      await emulator.runCommand("moveToWindowLineTopBottom");

      const expectedLine = lastVisibleRange.end.line - 2 + 1;
      assertCursorsEqual(activeTextEditor, [expectedLine, 0]);
    });
  });

  suite("mark mode behavior", () => {
    test("preserves selection when moving to middle", async () => {
      setEmptyCursors(activeTextEditor, [45, 0]);
      emulator.setMarkCommand();

      await emulator.runCommand("moveToWindowLineTopBottom");

      const expectedMiddleLine = calcMiddleLine(activeTextEditor.visibleRanges);
      if (expectedMiddleLine == null) {
        throw new Error("No visible ranges available to calculate middle line");
      }

      assert.notEqual(expectedMiddleLine, 45, "Target line should not be the same as initial cursor position");
      assertSelectionsEqual(activeTextEditor, [45, 0, expectedMiddleLine, 0]);
    });

    test("preserves selection with prefix argument", async () => {
      setEmptyCursors(activeTextEditor, [45, 0]);
      emulator.setMarkCommand();

      const firstVisibleRange = activeTextEditor.visibleRanges[0];
      if (!firstVisibleRange) {
        throw new Error("No visible range available");
      }

      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(5);
      await emulator.runCommand("moveToWindowLineTopBottom");

      const expectedLine = firstVisibleRange.start.line + 5;
      assert.notEqual(expectedLine, 45, "Target line should not be the same as initial cursor position");
      assertSelectionsEqual(activeTextEditor, [45, 0, expectedLine, 0]);
    });
  });

  suite("edge cases", () => {
    test("moves only primary cursor in multi-cursor scenario", async () => {
      // Set up multiple cursors
      activeTextEditor.selections = [
        new vscode.Selection(45, 0, 45, 0),
        new vscode.Selection(55, 0, 55, 0),
        new vscode.Selection(65, 0, 65, 0),
      ];

      await emulator.runCommand("moveToWindowLineTopBottom");

      const expectedMiddleLine = calcMiddleLine(activeTextEditor.visibleRanges);

      // Only the first cursor should move, others should remain unchanged
      assert.equal(activeTextEditor.selections.length, 3);
      assert.equal(activeTextEditor.selections[0]?.active.line, expectedMiddleLine);
      assert.equal(activeTextEditor.selections[1]?.active.line, 55);
      assert.equal(activeTextEditor.selections[2]?.active.line, 65);
    });

    test("handles single line document", async () => {
      // Create a single line document
      await clearTextEditor(activeTextEditor, "single line");

      setEmptyCursors(activeTextEditor, [0, 0]);

      await emulator.runCommand("moveToWindowLineTopBottom");

      // Should stay at line 0
      assertCursorsEqual(activeTextEditor, [0, 0]);
    });
  });

  suite("interruption handler", () => {
    test("resets position to Middle after user-cancel interruption", async () => {
      // Move to top state by cycling
      await emulator.runCommand("moveToWindowLineTopBottom"); // middle
      await emulator.runCommand("moveToWindowLineTopBottom"); // top

      // Now the command should be in Top state, simulate interruption
      emulator.onDidInterruptTextEditor({ reason: "user-cancel" });

      // Next call should go to middle (not bottom), confirming reset
      await emulator.runCommand("moveToWindowLineTopBottom");

      const expectedMiddleLine = calcMiddleLine(activeTextEditor.visibleRanges);
      if (expectedMiddleLine == null) {
        throw new Error("No visible ranges available to calculate middle line");
      }

      assertCursorsEqual(activeTextEditor, [expectedMiddleLine, 0]);
    });

    test("resets position to Middle after document-changed interruption", async () => {
      // Move to bottom state by cycling
      await emulator.runCommand("moveToWindowLineTopBottom"); // middle
      await emulator.runCommand("moveToWindowLineTopBottom"); // top
      await emulator.runCommand("moveToWindowLineTopBottom"); // bottom

      // Now the command should be in Bottom state, simulate interruption
      emulator.onDidInterruptTextEditor({
        reason: "document-changed",
        originalEvent: {
          reason: undefined,
          contentChanges: [],
          document: activeTextEditor.document,
        },
      });

      // Next call should go to middle (not middle), confirming reset
      await emulator.runCommand("moveToWindowLineTopBottom");

      const expectedMiddleLine = calcMiddleLine(activeTextEditor.visibleRanges);
      if (expectedMiddleLine == null) {
        throw new Error("No visible ranges available to calculate middle line");
      }

      assertCursorsEqual(activeTextEditor, [expectedMiddleLine, 0]);
    });

    test("resets position after user-driven selection change", async () => {
      // Move to top state by cycling
      await emulator.runCommand("moveToWindowLineTopBottom"); // middle
      await emulator.runCommand("moveToWindowLineTopBottom"); // top

      // Simulate user-driven selection change
      setEmptyCursors(activeTextEditor, [30, 0]);
      await delay(100); // Wait for the selection change event to be processed

      // Next call should go to middle (not bottom), confirming reset
      await emulator.runCommand("moveToWindowLineTopBottom");

      const expectedMiddleLine = calcMiddleLine(activeTextEditor.visibleRanges);
      if (expectedMiddleLine == null) {
        throw new Error("No visible ranges available to calculate middle line");
      }

      assertCursorsEqual(activeTextEditor, [expectedMiddleLine, 0]);
    });

    test("interruption during cycling sequence resets properly", async () => {
      // Start a cycling sequence
      await emulator.runCommand("moveToWindowLineTopBottom"); // middle
      await emulator.runCommand("moveToWindowLineTopBottom"); // top

      // Interrupt the sequence
      emulator.onDidInterruptTextEditor({
        reason: "document-changed",
        originalEvent: {
          reason: undefined,
          contentChanges: [],
          document: activeTextEditor.document,
        },
      });

      // The next two calls should be middle -> top (not bottom -> middle)
      await emulator.runCommand("moveToWindowLineTopBottom"); // should be middle
      await emulator.runCommand("moveToWindowLineTopBottom"); // should be top

      const firstVisibleRange = activeTextEditor.visibleRanges[0];
      if (firstVisibleRange) {
        assertCursorsEqual(activeTextEditor, [firstVisibleRange.start.line, 0]);
      }
    });
  });
});
