import * as vscode from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertTextEqual, cleanUpWorkspace, setEmptyCursors, setupWorkspace } from "../utils";

suite("deleteForwardChar", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "0123456789\nabcdefghij\nABCDEFGHIJ";
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("it deletes a character on the right", async () => {
    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator.runCommand("deleteForwardChar");
    assertTextEqual(activeTextEditor, "0123456789\nabcdeghij\nABCDEFGHIJ");
  });

  test("it works with prefix argument", async () => {
    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator.universalArgument();
    await emulator.runCommand("deleteForwardChar");
    assertTextEqual(activeTextEditor, "0123456789\nabcdej\nABCDEFGHIJ");

    await emulator.runCommand("deleteForwardChar");
    assertTextEqual(activeTextEditor, "0123456789\nabcde\nABCDEFGHIJ"); // prefix argument is disabled
  });

  test("it works in multi lines with prefix argument", async () => {
    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator.universalArgument();
    await emulator.subsequentArgumentDigit(8);
    await emulator.runCommand("deleteForwardChar");
    assertTextEqual(activeTextEditor, "0123456789\nabcdeCDEFGHIJ");
  });

  test("it works in shorter text than specified by prefix argument", async () => {
    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator.universalArgument();
    await emulator.universalArgument();
    await emulator.universalArgument();
    await emulator.runCommand("deleteForwardChar");
    assertTextEqual(activeTextEditor, "0123456789\nabcde");
  });
});

suite("deleteBackwardChar", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "0123456789\nabcdefghij\nABCDEFGHIJ";
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  test("it deletes a character on the right", async () => {
    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator.runCommand("deleteBackwardChar");
    assertTextEqual(activeTextEditor, "0123456789\nabcdfghij\nABCDEFGHIJ");
  });

  test("it works with prefix argument", async () => {
    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator.universalArgument();
    await emulator.runCommand("deleteBackwardChar");
    assertTextEqual(activeTextEditor, "0123456789\nafghij\nABCDEFGHIJ");

    await emulator.runCommand("deleteBackwardChar");
    assertTextEqual(activeTextEditor, "0123456789\nfghij\nABCDEFGHIJ"); // prefix argument is disabled
  });

  test("it works in multi lines with prefix argument", async () => {
    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator.universalArgument();
    await emulator.subsequentArgumentDigit(8);
    await emulator.runCommand("deleteBackwardChar");
    assertTextEqual(activeTextEditor, "01234567fghij\nABCDEFGHIJ");
  });

  test("it works in shorter text than specified by prefix argument", async () => {
    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator.universalArgument();
    await emulator.universalArgument();
    await emulator.universalArgument();
    await emulator.runCommand("deleteBackwardChar");
    assertTextEqual(activeTextEditor, "fghij\nABCDEFGHIJ");
  });
});
