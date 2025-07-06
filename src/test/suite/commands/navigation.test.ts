import * as vscode from "vscode";
import assert from "assert";
import { TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { Minibuffer } from "../../../minibuffer";
import {
  assertCursorsEqual,
  assertSelectionsEqual,
  setEmptyCursors,
  setupWorkspace,
  cleanUpWorkspace,
  clearTextEditor,
} from "../utils";

class MockMinibuffer implements Minibuffer {
  returnValues: (string | undefined)[];
  callCount: number;
  lastPrompt: string | undefined;
  lastValidationMessage: string | undefined;

  constructor(returnValues: (string | undefined)[]) {
    this.returnValues = returnValues;
    this.callCount = 0;
  }

  public get isReading(): boolean {
    return true;
  }

  public paste(): void {
    return;
  }

  public readFromMinibuffer(options?: { prompt?: string; validationMessage?: string }): Promise<string | undefined> {
    this.lastPrompt = options?.prompt;
    this.lastValidationMessage = options?.validationMessage;
    const returnValue = this.returnValues[this.callCount] ?? this.returnValues[this.returnValues.length - 1];
    this.callCount++;
    return Promise.resolve(returnValue);
  }
}

suite("GotoLine", () => {
  let activeTextEditor: TextEditor;
  let mockMinibuffer: MockMinibuffer;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9\nline 10\n".repeat(10);
    activeTextEditor = await setupWorkspace(initialText);
    // Each test will create its own emulator with MockMinibuffer
  });

  teardown(async () => {
    await cleanUpWorkspace();
  });

  suite("basic navigation", () => {
    test("navigates to specified line number", async () => {
      setEmptyCursors(activeTextEditor, [5, 3]);

      mockMinibuffer = new MockMinibuffer(["10"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      await emulator.runCommand("gotoLine");

      assertCursorsEqual(activeTextEditor, [9, 0]); // Line 10 -> index 9
    });

    test("navigates to line 1", async () => {
      setEmptyCursors(activeTextEditor, [20, 5]);

      mockMinibuffer = new MockMinibuffer(["1"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      await emulator.runCommand("gotoLine");

      assertCursorsEqual(activeTextEditor, [0, 0]); // Line 1 -> index 0
    });

    test("navigates to last line", async () => {
      setEmptyCursors(activeTextEditor, [5, 3]);
      const lastLineNumber = activeTextEditor.document.lineCount;

      mockMinibuffer = new MockMinibuffer([lastLineNumber.toString()]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      await emulator.runCommand("gotoLine");

      assertCursorsEqual(activeTextEditor, [lastLineNumber - 1, 0]);
    });

    test("clamps line number to document bounds - too high", async () => {
      setEmptyCursors(activeTextEditor, [5, 3]);
      const lastLineNumber = activeTextEditor.document.lineCount;

      mockMinibuffer = new MockMinibuffer(["9999"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      await emulator.runCommand("gotoLine");

      assertCursorsEqual(activeTextEditor, [lastLineNumber - 1, 0]);
    });

    test("clamps line number to document bounds - too low", async () => {
      setEmptyCursors(activeTextEditor, [5, 3]);

      mockMinibuffer = new MockMinibuffer(["-5"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      await emulator.runCommand("gotoLine");

      assertCursorsEqual(activeTextEditor, [0, 0]); // Clamped to line 1 -> index 0
    });
  });

  suite("mark-mode integration", () => {
    test("sets mark when not in mark mode", async () => {
      setEmptyCursors(activeTextEditor, [5, 3]);

      mockMinibuffer = new MockMinibuffer(["10"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      await emulator.runCommand("gotoLine");

      // Should be at line 10, and mark should be set at original position
      assertCursorsEqual(activeTextEditor, [9, 0]);

      // Test that mark was set by popping it
      emulator.popMark();
      assertCursorsEqual(activeTextEditor, [5, 3]);
    });

    test("preserves selection when in mark mode", async () => {
      setEmptyCursors(activeTextEditor, [5, 3]);

      mockMinibuffer = new MockMinibuffer(["10"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      emulator.setMarkCommand(); // Enter mark mode
      await emulator.runCommand("gotoLine");

      // Should create selection from original position to target line
      assertSelectionsEqual(activeTextEditor, [5, 3, 9, 0]);
    });

    test("does not set new mark when in mark mode", async () => {
      setEmptyCursors(activeTextEditor, [5, 3]);

      mockMinibuffer = new MockMinibuffer(["10"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      emulator.setMarkCommand(); // Enter mark mode
      await emulator.runCommand("gotoLine");

      // Should have selection from original position to target line (gotoLine in mark mode preserves selection)
      assertSelectionsEqual(activeTextEditor, [5, 3, 9, 0]);

      // If no new mark was added to the mark ring, popMark should return to the original position
      // (because setMarkCommand already pushed the original position to the mark ring)
      emulator.popMark();
      assertCursorsEqual(activeTextEditor, [5, 3]); // Should return to original position

      // Try popMark again - if gotoLine didn't add a mark, cursor should stay at [5, 3]
      emulator.popMark();
      assertCursorsEqual(activeTextEditor, [5, 3]); // Should remain at original position
    });
  });

  suite("input validation", () => {
    test("prompts again for invalid input", async () => {
      setEmptyCursors(activeTextEditor, [5, 3]);

      mockMinibuffer = new MockMinibuffer(["abc", "xyz", "10"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      await emulator.runCommand("gotoLine");

      // Should eventually navigate to line 10
      assertCursorsEqual(activeTextEditor, [9, 0]);

      // Should have been called 3 times
      assert.equal(mockMinibuffer.callCount, 3);

      // Check validation messages were set (the MockMinibuffer tracks them)
      assert.equal(mockMinibuffer.lastValidationMessage, "Please enter a number.");
    });

    test("handles empty input", async () => {
      setEmptyCursors(activeTextEditor, [5, 3]);

      mockMinibuffer = new MockMinibuffer(["", "10"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      await emulator.runCommand("gotoLine");

      assertCursorsEqual(activeTextEditor, [9, 0]);
      assert.equal(mockMinibuffer.callCount, 2);
    });

    test("handles whitespace input", async () => {
      setEmptyCursors(activeTextEditor, [5, 3]);

      mockMinibuffer = new MockMinibuffer(["   ", "10"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      await emulator.runCommand("gotoLine");

      assertCursorsEqual(activeTextEditor, [9, 0]);
      assert.equal(mockMinibuffer.callCount, 2);
    });

    [" 10", "10 ", "  10  ", "   10   "].forEach((input) => {
      test(`handles numeric input with whitespaces: "${input}"`, async () => {
        setEmptyCursors(activeTextEditor, [5, 3]);

        mockMinibuffer = new MockMinibuffer([input]);
        emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

        await emulator.runCommand("gotoLine");

        assertCursorsEqual(activeTextEditor, [9, 0]);
      });
    });

    test("handles cancellation", async () => {
      setEmptyCursors(activeTextEditor, [5, 3]);
      const originalPosition = activeTextEditor.selection.active;

      mockMinibuffer = new MockMinibuffer([undefined]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      await emulator.runCommand("gotoLine");

      // Should remain at original position
      assert.equal(activeTextEditor.selection.active.line, originalPosition.line);
      assert.equal(activeTextEditor.selection.active.character, originalPosition.character);
    });

    test("accepts floating point numbers (truncates to integer, which is different from original behavior of Emacs)", async () => {
      setEmptyCursors(activeTextEditor, [5, 3]);

      mockMinibuffer = new MockMinibuffer(["10.7"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      await emulator.runCommand("gotoLine");

      assertCursorsEqual(activeTextEditor, [9, 0]); // Should truncate to 10
    });
  });

  suite("multi-cursor termination", () => {
    test("terminates multi-cursor mode", async () => {
      // Set up multiple cursors
      activeTextEditor.selections = [
        new vscode.Selection(5, 3, 5, 3),
        new vscode.Selection(10, 2, 10, 2),
        new vscode.Selection(15, 1, 15, 1),
      ];

      mockMinibuffer = new MockMinibuffer(["20"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      await emulator.runCommand("gotoLine");

      // Should have only one cursor at target line
      assert.equal(activeTextEditor.selections.length, 1);
      assertCursorsEqual(activeTextEditor, [19, 0]);
    });

    test("terminates multi-cursor mode in mark mode", async () => {
      // Set up multiple cursors
      activeTextEditor.selections = [
        new vscode.Selection(5, 3, 5, 3),
        new vscode.Selection(10, 2, 10, 2),
        new vscode.Selection(15, 1, 15, 1),
      ];

      mockMinibuffer = new MockMinibuffer(["20"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      emulator.setMarkCommand(); // Enter mark mode
      await emulator.runCommand("gotoLine");

      // Should have only one selection from original primary cursor to target
      assert.equal(activeTextEditor.selections.length, 1);
      assertSelectionsEqual(activeTextEditor, [5, 3, 19, 0]);
    });

    test("uses primary cursor anchor for mark mode", async () => {
      mockMinibuffer = new MockMinibuffer(["20"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      // Set up multiple cursors with different anchors
      activeTextEditor.selections = [
        new vscode.Selection(5, 3, 5, 3),
        new vscode.Selection(10, 2, 10, 2),
        new vscode.Selection(15, 1, 15, 1),
      ];

      emulator.setMarkCommand();
      // Move primary cursor to a different position
      await emulator.runCommand("forwardChar");
      await emulator.runCommand("forwardChar");
      await emulator.runCommand("forwardChar");
      await emulator.runCommand("nextLine");
      await emulator.runCommand("nextLine");

      await emulator.runCommand("gotoLine");

      // Should keep the primary cursor anchor and create a selection
      // from it to the target line
      assert.equal(activeTextEditor.selections.length, 1);
      assertSelectionsEqual(activeTextEditor, [5, 3, 19, 0]);
    });
  });

  suite("edge cases", () => {
    test("handles single line document", async () => {
      await clearTextEditor(activeTextEditor, "single line");
      const minibuffer = new MockMinibuffer(["1"]);
      const emulator = new EmacsEmulator(activeTextEditor, null, minibuffer);

      setEmptyCursors(activeTextEditor, [0, 5]);

      await emulator.runCommand("gotoLine");

      assertCursorsEqual(activeTextEditor, [0, 0]);
    });

    test("handles empty document", async () => {
      await clearTextEditor(activeTextEditor, "");
      const minibuffer = new MockMinibuffer(["1"]);
      const emulator = new EmacsEmulator(activeTextEditor, null, minibuffer);

      await emulator.runCommand("gotoLine");

      // Should stay at line 0 (only line in empty document)
      assertCursorsEqual(activeTextEditor, [0, 0]);
    });

    test("handles zero input", async () => {
      setEmptyCursors(activeTextEditor, [5, 3]);

      mockMinibuffer = new MockMinibuffer(["0"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      await emulator.runCommand("gotoLine");

      // Should clamp to line 1 (index 0)
      assertCursorsEqual(activeTextEditor, [0, 0]);
    });

    test("handles very large line numbers", async () => {
      setEmptyCursors(activeTextEditor, [5, 3]);
      const lastLineNumber = activeTextEditor.document.lineCount;

      mockMinibuffer = new MockMinibuffer(["999999999"]);
      emulator = new EmacsEmulator(activeTextEditor, null, mockMinibuffer);

      await emulator.runCommand("gotoLine");

      // Should clamp to last line
      assertCursorsEqual(activeTextEditor, [lastLineNumber - 1, 0]);
    });
  });
});
