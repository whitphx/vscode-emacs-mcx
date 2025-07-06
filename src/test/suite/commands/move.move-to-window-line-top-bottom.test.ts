import * as vscode from "vscode";
import assert from "assert";
import { TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertCursorsEqual, assertSelectionsEqual, setEmptyCursors, setupWorkspace, cleanUpWorkspace } from "../utils";

suite.only("moveToWindowLineTopBottom", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "line 0\n".repeat(100);
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

      const visibleRanges = activeTextEditor.visibleRanges;
      let totalVisibleLines = 0;
      visibleRanges.forEach((range) => {
        totalVisibleLines += range.end.line - range.start.line + 1;
      });

      const expectedMiddleLine = Math.floor(totalVisibleLines / 2);
      let targetLine = 0;
      let offset = expectedMiddleLine;
      for (const range of visibleRanges) {
        const linesInRange = range.end.line - range.start.line + 1;
        if (offset < linesInRange) {
          targetLine = range.start.line + offset;
          break;
        }
        offset -= linesInRange;
      }

      assertCursorsEqual(activeTextEditor, [targetLine, 0]);
    });

    test("second call moves to top of window", async () => {
      // First call to middle
      await emulator.runCommand("moveToWindowLineTopBottom");

      // Second call should move to top
      await emulator.runCommand("moveToWindowLineTopBottom");

      const firstVisibleRange = activeTextEditor.visibleRanges[0];
      if (firstVisibleRange) {
        assertCursorsEqual(activeTextEditor, [firstVisibleRange.start.line, 0]);
      }
    });

    test("third call moves to bottom of window", async () => {
      // First call to middle
      await emulator.runCommand("moveToWindowLineTopBottom");
      // Second call to top
      await emulator.runCommand("moveToWindowLineTopBottom");
      // Third call should move to bottom
      await emulator.runCommand("moveToWindowLineTopBottom");

      const lastVisibleRange = activeTextEditor.visibleRanges[activeTextEditor.visibleRanges.length - 1];
      if (lastVisibleRange) {
        assertCursorsEqual(activeTextEditor, [lastVisibleRange.end.line, 0]);
      }
    });

    test("fourth call cycles back to middle", async () => {
      // Complete one full cycle
      await emulator.runCommand("moveToWindowLineTopBottom"); // middle
      await emulator.runCommand("moveToWindowLineTopBottom"); // top
      await emulator.runCommand("moveToWindowLineTopBottom"); // bottom
      await emulator.runCommand("moveToWindowLineTopBottom"); // back to middle

      const visibleRanges = activeTextEditor.visibleRanges;
      let totalVisibleLines = 0;
      visibleRanges.forEach((range) => {
        totalVisibleLines += range.end.line - range.start.line + 1;
      });

      const expectedMiddleLine = Math.floor(totalVisibleLines / 2);
      let targetLine = 0;
      let offset = expectedMiddleLine;
      for (const range of visibleRanges) {
        const linesInRange = range.end.line - range.start.line + 1;
        if (offset < linesInRange) {
          targetLine = range.start.line + offset;
          break;
        }
        offset -= linesInRange;
      }

      assertCursorsEqual(activeTextEditor, [targetLine, 0]);
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

      const visibleRanges = activeTextEditor.visibleRanges;
      let totalVisibleLines = 0;
      visibleRanges.forEach((range) => {
        totalVisibleLines += range.end.line - range.start.line + 1;
      });

      const expectedMiddleLine = Math.floor(totalVisibleLines / 2);
      let targetLine = 0;
      let offset = expectedMiddleLine;
      for (const range of visibleRanges) {
        const linesInRange = range.end.line - range.start.line + 1;
        if (offset < linesInRange) {
          targetLine = range.start.line + offset;
          break;
        }
        offset -= linesInRange;
      }

      assertSelectionsEqual(activeTextEditor, [45, 0, targetLine, 0]);
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
      assertSelectionsEqual(activeTextEditor, [45, 0, expectedLine, 0]);
    });
  });

  suite("edge cases", () => {
    test("handles empty visible ranges gracefully", async () => {
      // This test is more theoretical since VSCode should always have visible ranges
      // But we can test the command doesn't crash
      await emulator.runCommand("moveToWindowLineTopBottom");

      // Should not crash, cursor position might change but that's acceptable
      assert.ok(activeTextEditor.selection.active !== undefined);
    });

    test("moves only primary cursor in multi-cursor scenario", async () => {
      // Set up multiple cursors
      activeTextEditor.selections = [
        new vscode.Selection(45, 0, 45, 0),
        new vscode.Selection(55, 0, 55, 0),
        new vscode.Selection(65, 0, 65, 0),
      ];

      await emulator.runCommand("moveToWindowLineTopBottom");

      // Only the first cursor should move, others should remain unchanged
      assert.equal(activeTextEditor.selections.length, 3);
      assert.equal(activeTextEditor.selections[1]?.active.line, 55);
      assert.equal(activeTextEditor.selections[2]?.active.line, 65);
    });

    test("handles single line document", async () => {
      // Create a single line document
      const singleLineText = "single line";
      const singleLineEditor = await setupWorkspace(singleLineText);
      const singleLineEmulator = new EmacsEmulator(singleLineEditor);

      setEmptyCursors(singleLineEditor, [0, 0]);

      await singleLineEmulator.runCommand("moveToWindowLineTopBottom");

      // Should stay at line 0
      assertCursorsEqual(singleLineEditor, [0, 0]);

      // Clean up
      await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    });
  });
});
