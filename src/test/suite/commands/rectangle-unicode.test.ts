import * as assert from "assert";
import * as vscode from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { cleanUpWorkspace, setupWorkspace } from "../utils";

suite("Rectangle operations with Unicode characters", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = [
      "こんにちは世界", // Japanese text
      "αβγδεζηθ", // Greek text
      "👨‍👩‍👧‍👦 🌍 🎉", // Emoji with ZWJ sequences
      "안녕하세요", // Korean text
      "你好世界", // Chinese text
    ].join("\n");

    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("rectangle-mark-mode preserves Unicode character boundaries", async () => {
    // Start selection from middle of Japanese text to middle of Greek text
    await emulator.runCommand("beginningOfBuffer");
    await emulator.runCommand("forwardChar");
    emulator.rectangleMarkMode();
    await emulator.runCommand("nextLine");
    await emulator.runCommand("forwardChar");

    const selections = activeTextEditor.selections;
    assert.strictEqual(selections.length, 2, "Expected exactly 2 selections");
    assert.ok(
      selections.every((sel) => !sel.isEmpty),
      "All selections should be non-empty",
    );
  });

  test("rectangle-mark-mode with variable-width Unicode characters", async () => {
    // Select across emoji line
    await emulator.runCommand("beginningOfBuffer");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");
    emulator.rectangleMarkMode();
    await emulator.runCommand("nextLine");
    await emulator.runCommand("forwardChar");

    const selections = activeTextEditor.selections;
    assert.strictEqual(selections.length, 2, "Expected exactly 2 selections");
    assert.ok(
      selections.every((sel) => !sel.isEmpty),
      "All selections should be non-empty",
    );
  });

  test("rectangle-mark-mode with mixed-width characters", async () => {
    // Select from Korean to Chinese text
    await emulator.runCommand("beginningOfBuffer");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    emulator.rectangleMarkMode();
    await emulator.runCommand("nextLine");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");

    const selections = activeTextEditor.selections;
    assert.strictEqual(selections.length, 2, "Expected exactly 2 selections");
    assert.ok(
      selections.every((sel) => !sel.isEmpty),
      "All selections should be non-empty",
    );
  });
});
