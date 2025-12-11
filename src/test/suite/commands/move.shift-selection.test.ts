import * as vscode from "vscode";
import assert from "assert";
import { EmacsEmulator } from "../../../emulator";
import { assertSelectionsEqual, cleanUpWorkspace, createEmulator, setEmptyCursors, setupWorkspace } from "../utils";

suite("shift selection move commands", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace("abc def");
    emulator = createEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("forwardChar with shift sets mark and extends selection", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.runCommand("forwardChar", { shift: true });
    assertSelectionsEqual(activeTextEditor, [0, 0, 0, 1]);
    assert.strictEqual(emulator.isInMarkMode, true);

    await emulator.runCommand("forwardChar", { shift: true });
    assertSelectionsEqual(activeTextEditor, [0, 0, 0, 2]);
    assert.strictEqual(emulator.isInMarkMode, true);

    emulator.popMark();
    assertSelectionsEqual(activeTextEditor, [0, 0, 0, 0]);
    assert.strictEqual(emulator.isInMarkMode, false);
  });

  test("forwardChar without shift after shift selection ends mark mode", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.runCommand("forwardChar", { shift: true });
    assertSelectionsEqual(activeTextEditor, [0, 0, 0, 1]);
    assert.strictEqual(emulator.isInMarkMode, true);

    await emulator.runCommand("forwardChar", { shift: false });
    assertSelectionsEqual(activeTextEditor, [0, 2, 0, 2]);
    assert.strictEqual(emulator.isInMarkMode, false);
  });

  test("backwardChar extends selection when requested", async () => {
    setEmptyCursors(activeTextEditor, [0, 3]);

    await emulator.runCommand("backwardChar", { shift: true });
    assertSelectionsEqual(activeTextEditor, [0, 3, 0, 2]);
    assert.strictEqual(emulator.isInMarkMode, true);

    await emulator.runCommand("backwardChar", { shift: true });
    assertSelectionsEqual(activeTextEditor, [0, 3, 0, 1]);
    assert.strictEqual(emulator.isInMarkMode, true);

    emulator.popMark();
    assertSelectionsEqual(activeTextEditor, [0, 3, 0, 3]);
    assert.strictEqual(emulator.isInMarkMode, false);
  });

  test("backwardChar without shift after shift selection ends mark mode", async () => {
    setEmptyCursors(activeTextEditor, [0, 3]);

    await emulator.runCommand("backwardChar", { shift: true });
    assertSelectionsEqual(activeTextEditor, [0, 3, 0, 2]);
    assert.strictEqual(emulator.isInMarkMode, true);

    await emulator.runCommand("backwardChar", { shift: false });
    assertSelectionsEqual(activeTextEditor, [0, 1, 0, 1]);
    assert.strictEqual(emulator.isInMarkMode, false);
  });

  test("forwardWord extends selection when requested", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.runCommand("forwardWord", { shift: true });
    assertSelectionsEqual(activeTextEditor, [0, 0, 0, 3]);
    assert.strictEqual(emulator.isInMarkMode, true);

    await emulator.runCommand("forwardWord", { shift: true });
    assertSelectionsEqual(activeTextEditor, [0, 0, 0, 7]);
    assert.strictEqual(emulator.isInMarkMode, true);

    emulator.popMark();
    assertSelectionsEqual(activeTextEditor, [0, 0, 0, 0]);
    assert.strictEqual(emulator.isInMarkMode, false);
  });

  test("forwardWord without shift after shift selection ends mark mode", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.runCommand("forwardWord", { shift: true });
    assertSelectionsEqual(activeTextEditor, [0, 0, 0, 3]);
    assert.strictEqual(emulator.isInMarkMode, true);

    await emulator.runCommand("forwardWord", { shift: false });
    assertSelectionsEqual(activeTextEditor, [0, 7, 0, 7]);
    assert.strictEqual(emulator.isInMarkMode, false);
  });

  test("backwardWord extends selection when requested", async () => {
    setEmptyCursors(activeTextEditor, [0, 7]);

    await emulator.runCommand("backwardWord", { shift: true });
    assertSelectionsEqual(activeTextEditor, [0, 7, 0, 4]);
    assert.strictEqual(emulator.isInMarkMode, true);

    await emulator.runCommand("backwardWord", { shift: true });
    assertSelectionsEqual(activeTextEditor, [0, 7, 0, 0]);
    assert.strictEqual(emulator.isInMarkMode, true);

    emulator.popMark();
    assertSelectionsEqual(activeTextEditor, [0, 7, 0, 7]);
    assert.strictEqual(emulator.isInMarkMode, false);
  });

  test("backwardWord without shift after shift selection ends mark mode", async () => {
    setEmptyCursors(activeTextEditor, [0, 7]);

    await emulator.runCommand("backwardWord", { shift: true });
    assertSelectionsEqual(activeTextEditor, [0, 7, 0, 4]);
    assert.strictEqual(emulator.isInMarkMode, true);

    await emulator.runCommand("backwardWord", { shift: false });
    assertSelectionsEqual(activeTextEditor, [0, 0, 0, 0]);
    assert.strictEqual(emulator.isInMarkMode, false);
  });
});
