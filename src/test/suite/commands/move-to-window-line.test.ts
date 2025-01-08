import * as vscode from "vscode";
import assert from "assert";
import { EmacsEmulator } from "../../../emulator";
import { assertSelectionsEqual, setupWorkspace, cleanUpWorkspace, delay } from "../utils";

suite("MoveToWindowLineTopBottom", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    // Create a document with enough lines to test scrolling and positioning
    const initialText = "\n".repeat(1000);
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);

    // Set up a proper visible range by positioning cursor and revealing
    activeTextEditor.selection = new vscode.Selection(500, 0, 500, 0);

    // Position cursor and reveal it in the center of the viewport
    await vscode.commands.executeCommand("revealLine", {
      lineNumber: 500,
      at: "center",
    });
    await delay(100);

    // Verify we have a valid visible range
    const initialRange = activeTextEditor.visibleRanges[0];
    if (!initialRange) {
      throw new Error("No visible range available after setup");
    }

    // Ensure we have enough lines visible for testing
    const visibleLines = initialRange.end.line - initialRange.start.line;
    if (visibleLines < 10) {
      throw new Error("Not enough lines visible for testing. Need at least 10 visible lines.");
    }
  });

  teardown(cleanUpWorkspace);

  test("cycles through center, top, and bottom positions", async () => {
    let cycleRange: vscode.Range | undefined;
    // Position cursor somewhere in the middle
    activeTextEditor.selection = new vscode.Selection(500, 0, 500, 0);

    // First call - should move to center
    await emulator.runCommand("moveToWindowLineTopBottom");
    await delay(100); // Wait for editor to update

    cycleRange = activeTextEditor.visibleRanges[0];
    assert.ok(cycleRange, "Editor should have a visible range");

    const centerLine = activeTextEditor.selection.active.line;
    assert.ok(
      cycleRange.contains(activeTextEditor.selection.active),
      "Cursor should be visible after moving to center",
    );
    assert.ok(
      Math.abs(centerLine - (cycleRange.start.line + cycleRange.end.line) / 2) <= 1,
      "First call should position cursor at center line",
    );

    // Second call - should move to top
    await emulator.runCommand("moveToWindowLineTopBottom");
    await delay(100);

    cycleRange = activeTextEditor.visibleRanges[0];
    assert.ok(cycleRange, "Editor should have a visible range after second call");
    assert.ok(cycleRange, "Editor should have a visible range");
    assert.strictEqual(
      activeTextEditor.selection.active.line,
      cycleRange.start.line,
      "Second call should position cursor at top line",
    );

    // Third call - should move to bottom
    await emulator.runCommand("moveToWindowLineTopBottom");
    await delay(100);

    cycleRange = activeTextEditor.visibleRanges[0];
    assert.ok(cycleRange, "Editor should have a visible range after third call");
    assert.ok(cycleRange, "Editor should have a visible range");
    assert.strictEqual(
      activeTextEditor.selection.active.line,
      cycleRange.end.line,
      "Third call should position cursor at bottom line",
    );

    // Fourth call - should move back to center
    await emulator.runCommand("moveToWindowLineTopBottom");
    await delay(100);

    cycleRange = activeTextEditor.visibleRanges[0];
    assert.ok(cycleRange, "Editor should have a visible range after fourth call");
    assert.ok(cycleRange, "Editor should have a visible range");
    assert.ok(
      Math.abs(activeTextEditor.selection.active.line - (cycleRange.start.line + cycleRange.end.line) / 2) <= 1,
      "Fourth call should position cursor back at center line",
    );
  });

  test("handles positive prefix arguments", async () => {
    activeTextEditor.selection = new vscode.Selection(500, 0, 500, 0);

    // Move with prefix argument 0 (should go to top)
    await emulator.runCommand("universalArgument");
    await emulator.runCommand("digitArgument", ["0"]);
    await emulator.runCommand("moveToWindowLineTopBottom");
    await delay(100);

    const visibleRange = activeTextEditor.visibleRanges[0];
    assert.ok(visibleRange, "Editor should have a visible range");
    assert.strictEqual(
      activeTextEditor.selection.active.line,
      visibleRange.start.line,
      "Prefix argument 0 should move cursor to top line",
    );

    // Move with prefix argument 2 (should go to second line from top)
    await emulator.runCommand("universalArgument");
    await emulator.runCommand("digitArgument", ["2"]);
    await emulator.runCommand("moveToWindowLineTopBottom");
    await delay(100);

    const prefixRange = activeTextEditor.visibleRanges[0];
    assert.ok(prefixRange, "Editor should have a visible range");
    assert.strictEqual(
      activeTextEditor.selection.active.line,
      prefixRange.start.line + 2,
      "Prefix argument 2 should move cursor to second line from top",
    );
  });

  test("handles negative prefix arguments", async () => {
    let negativeRange: vscode.Range | undefined;
    activeTextEditor.selection = new vscode.Selection(500, 0, 500, 0);

    // Move with prefix argument -1 (should go to bottom)
    await emulator.runCommand("universalArgument");
    await emulator.runCommand("negativeArgument");
    await emulator.runCommand("digitArgument", ["1"]);
    await emulator.runCommand("moveToWindowLineTopBottom");
    await delay(100);

    negativeRange = activeTextEditor.visibleRanges[0];
    assert.ok(negativeRange, "Editor should have a visible range");
    assert.strictEqual(
      activeTextEditor.selection.active.line,
      negativeRange.end.line,
      "Prefix argument -1 should move cursor to bottom line",
    );

    // Move with prefix argument -2 (should go to second line from bottom)
    await emulator.runCommand("universalArgument");
    await emulator.runCommand("negativeArgument");
    await emulator.runCommand("digitArgument", ["2"]);
    await emulator.runCommand("moveToWindowLineTopBottom");
    await delay(100);

    negativeRange = activeTextEditor.visibleRanges[0];
    assert.ok(negativeRange, "Editor should have a visible range");
    assert.strictEqual(
      activeTextEditor.selection.active.line,
      negativeRange.end.line - 1,
      "Prefix argument -2 should move cursor to second line from bottom",
    );
  });

  test("preserves mark when active", async () => {
    activeTextEditor.selection = new vscode.Selection(500, 0, 500, 0);

    // Set mark and move
    emulator.setMarkCommand();
    await emulator.runCommand("moveToWindowLineTopBottom");
    await delay(100);

    const markRange = activeTextEditor.visibleRanges[0];
    assert.ok(markRange, "Editor should have a visible range");
    const centerLine = Math.floor((markRange.start.line + markRange.end.line) / 2);

    assertSelectionsEqual(activeTextEditor, new vscode.Selection(500, 0, centerLine, 0));
  });

  test("always positions cursor at left margin", async () => {
    // Create a line with some text
    await activeTextEditor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(500, 0), "    Some text with indentation");
    });

    activeTextEditor.selection = new vscode.Selection(500, 10, 500, 10);
    await emulator.runCommand("moveToWindowLineTopBottom");
    await delay(100);

    assert.strictEqual(activeTextEditor.selection.active.character, 0, "Cursor should be positioned at left margin");
  });

  test("handles folded code blocks with multiple visible ranges", async () => {
    // Create a document with multiple sections to fold
    const content = Array(1000)
      .fill(0)
      .map((_, i) => {
        if (i % 100 === 0) return `Section ${i / 100} {`;
        if (i % 100 === 99) return "}";
        return `  Line ${i}`;
      })
      .join("\n");

    activeTextEditor = await setupWorkspace(content);
    emulator = new EmacsEmulator(activeTextEditor);

    // Fold multiple sections to create multiple visible ranges
    await vscode.commands.executeCommand("editor.fold", {
      levels: 1,
      direction: "up",
      selectionLines: [100, 300, 500, 700],
    });
    await delay(500); // Wait for folding to complete

    // Position cursor in the middle of a visible range
    activeTextEditor.selection = new vscode.Selection(200, 0, 200, 0);
    await vscode.commands.executeCommand("revealLine", {
      lineNumber: 200,
      at: "center",
    });
    await delay(500);

    // Verify initial state
    const initialRanges = activeTextEditor.visibleRanges;
    assert.ok(initialRanges.length > 1, "Should have multiple visible ranges after folding");

    // Test cycling within the current visible range
    await emulator.runCommand("moveToWindowLineTopBottom");
    await delay(100);

    // Should move to center of current visible range
    const currentRange = activeTextEditor.visibleRanges.find(
      (range) =>
        range.start.line <= activeTextEditor.selection.active.line &&
        range.end.line >= activeTextEditor.selection.active.line,
    );
    assert.ok(currentRange, "Cursor should be within a visible range");
    const expectedCenter = Math.floor((currentRange.start.line + currentRange.end.line) / 2);
    assert.strictEqual(
      activeTextEditor.selection.active.line,
      expectedCenter,
      "First press should move to center of current visible range",
    );

    // Test prefix argument with folded ranges
    await emulator.runCommand("universalArgument");
    await emulator.runCommand("digitArgument", ["2"]);
    await emulator.runCommand("moveToWindowLineTopBottom");
    await delay(100);

    assert.strictEqual(
      activeTextEditor.selection.active.line,
      currentRange.start.line + 2,
      "Prefix argument should count from top of current visible range",
    );

    // Test negative prefix argument
    await emulator.runCommand("universalArgument");
    await emulator.runCommand("negativeArgument");
    await emulator.runCommand("digitArgument", ["1"]);
    await emulator.runCommand("moveToWindowLineTopBottom");
    await delay(100);

    assert.strictEqual(
      activeTextEditor.selection.active.line,
      currentRange.end.line,
      "Negative prefix argument should count from bottom of current visible range",
    );
  });
});
