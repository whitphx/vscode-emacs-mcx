import * as vscode from "vscode";
import * as expect from "expect";
import { EmacsEmulator } from "../../emulator";
import { cleanUpWorkspace, setEmptyCursors, setupWorkspace, delay, assertTextEqual } from "./utils";

suite("RectangleMarkMode", () => {
  let activeTextEditor: vscode.TextEditor;

  setup(async () => {
    const initialText = `0123456789
abcdefghij
ABCDEFGHIJ
klmnopqrst
KLMNOPQRST`;
    activeTextEditor = await setupWorkspace(initialText);
  });

  teardown(cleanUpWorkspace);

  test("expanding the rect from top left to right bottom and toggling and cancelling rectangle-mark-mode", async () => {
    setEmptyCursors(activeTextEditor, [1, 2]);
    const emulator = new EmacsEmulator(activeTextEditor);

    emulator.rectangleMarkMode();

    expect(activeTextEditor.selections).toEqual([new vscode.Selection(1, 2, 1, 2)]);

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");

    expect(activeTextEditor.selections).toEqual([new vscode.Selection(1, 2, 1, 4), new vscode.Selection(2, 2, 2, 4)]);

    emulator.rectangleMarkMode();

    expect(activeTextEditor.selections).toEqual([new vscode.Selection(1, 2, 2, 4)]);

    emulator.rectangleMarkMode();

    expect(activeTextEditor.selections).toEqual([new vscode.Selection(1, 2, 1, 4), new vscode.Selection(2, 2, 2, 4)]);

    emulator.cancel();

    expect(activeTextEditor.selections).toEqual([new vscode.Selection(2, 4, 2, 4)]);
  });

  test("expanding the rect from right bottom to left top and toggling rectangle-mark-mode", async () => {
    setEmptyCursors(activeTextEditor, [2, 4]);
    const emulator = new EmacsEmulator(activeTextEditor);

    emulator.rectangleMarkMode();

    expect(activeTextEditor.selections).toEqual([new vscode.Selection(2, 4, 2, 4)]);

    await emulator.runCommand("backwardChar");
    await emulator.runCommand("backwardChar");
    await emulator.runCommand("previousLine");

    expect(activeTextEditor.selections).toEqual([new vscode.Selection(2, 4, 2, 2), new vscode.Selection(1, 4, 1, 2)]);

    emulator.rectangleMarkMode();

    expect(activeTextEditor.selections).toEqual([new vscode.Selection(2, 4, 1, 2)]);

    emulator.rectangleMarkMode();

    expect(activeTextEditor.selections).toEqual([new vscode.Selection(2, 4, 2, 2), new vscode.Selection(1, 4, 1, 2)]);
    emulator.cancel();

    expect(activeTextEditor.selections).toEqual([new vscode.Selection(1, 2, 1, 2)]);
  });

  test("killing and yanking in rectangle-mark-mode", async () => {
    setEmptyCursors(activeTextEditor, [1, 2]);
    const emulator = new EmacsEmulator(activeTextEditor);

    emulator.rectangleMarkMode();

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");

    expect(activeTextEditor.selections).toEqual([
      new vscode.Selection(1, 2, 1, 4),
      new vscode.Selection(2, 2, 2, 4),
      new vscode.Selection(3, 2, 3, 4),
    ]);

    await emulator.runCommand("killRegion");

    assertTextEqual(
      activeTextEditor,
      `0123456789
abefghij
ABEFGHIJ
klopqrst
KLMNOPQRST`
    );

    // expect(activeTextEditor.selections).toEqual([new vscode.Selection(3, 2, 3, 2)]); // TODO: Now not supported
  });

  test("typing a character in rectangle-mark-mode", async () => {
    setEmptyCursors(activeTextEditor, [1, 2]);
    const emulator = new EmacsEmulator(activeTextEditor);

    emulator.rectangleMarkMode();

    expect(activeTextEditor.selections).toEqual([new vscode.Selection(1, 2, 1, 2)]);

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");

    expect(activeTextEditor.selections).toEqual([new vscode.Selection(1, 2, 1, 4), new vscode.Selection(2, 2, 2, 4)]);

    await emulator.typeChar("x");

    await delay(); // Wait for all related event listeners to have been called

    expect(activeTextEditor.selections).toEqual([new vscode.Selection(2, 5, 2, 5)]);
    expect(activeTextEditor.document.getText()).toEqual(`0123456789
abcdefghij
ABCDxEFGHIJ
klmnopqrst
KLMNOPQRST`);
  });
});
