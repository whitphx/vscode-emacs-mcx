import * as vscode from "vscode";
import assert from "assert";
import { EmacsEmulator } from "../../emulator";
import { cleanUpWorkspace, setEmptyCursors, setupWorkspace, delay, assertTextEqual, clearTextEditor } from "./utils";
import { KillRing } from "../../kill-yank/kill-ring";

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

    assert.deepStrictEqual(activeTextEditor.selections, [new vscode.Selection(1, 2, 1, 2)]);

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");

    assert.deepStrictEqual(activeTextEditor.selections, [
      new vscode.Selection(1, 2, 1, 4),
      new vscode.Selection(2, 2, 2, 4),
    ]);

    emulator.rectangleMarkMode();

    assert.deepStrictEqual(activeTextEditor.selections, [new vscode.Selection(1, 2, 2, 4)]);

    emulator.rectangleMarkMode();

    assert.deepStrictEqual(activeTextEditor.selections, [
      new vscode.Selection(1, 2, 1, 4),
      new vscode.Selection(2, 2, 2, 4),
    ]);

    emulator.cancel();

    assert.deepStrictEqual(activeTextEditor.selections, [new vscode.Selection(2, 4, 2, 4)]);
  });

  test("expanding the rect from right bottom to left top and toggling rectangle-mark-mode", async () => {
    setEmptyCursors(activeTextEditor, [2, 4]);
    const emulator = new EmacsEmulator(activeTextEditor);

    emulator.rectangleMarkMode();

    assert.deepStrictEqual(activeTextEditor.selections, [new vscode.Selection(2, 4, 2, 4)]);

    await emulator.runCommand("backwardChar");
    await emulator.runCommand("backwardChar");
    await emulator.runCommand("previousLine");

    assert.deepStrictEqual(activeTextEditor.selections, [
      new vscode.Selection(2, 4, 2, 2),
      new vscode.Selection(1, 4, 1, 2),
    ]);

    emulator.rectangleMarkMode();

    assert.deepStrictEqual(activeTextEditor.selections, [new vscode.Selection(2, 4, 1, 2)]);

    emulator.rectangleMarkMode();

    assert.deepStrictEqual(activeTextEditor.selections, [
      new vscode.Selection(2, 4, 2, 2),
      new vscode.Selection(1, 4, 1, 2),
    ]);
    emulator.cancel();

    assert.deepStrictEqual(activeTextEditor.selections, [new vscode.Selection(1, 2, 1, 2)]);
  });

  test("killing and yanking in rectangle-mark-mode", async () => {
    setEmptyCursors(activeTextEditor, [1, 2]);
    const killRing = new KillRing(3);
    const emulator = new EmacsEmulator(activeTextEditor, killRing);

    emulator.rectangleMarkMode();

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");

    assert.deepStrictEqual(activeTextEditor.selections, [
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
KLMNOPQRST`,
    );

    assert.deepStrictEqual(activeTextEditor.selections, [new vscode.Selection(3, 2, 3, 2)]);

    // Yank the killed text in the rect-mark-mode.
    // The text is yanked as a rectangle and automatically indented.
    setEmptyCursors(activeTextEditor, [4, 2]);
    await emulator.runCommand("yank");
    assertTextEqual(
      activeTextEditor,
      `0123456789
abefghij
ABEFGHIJ
klopqrst
KLcdMNOPQRST
  CD
  mn`,
    );
  });

  test("killing in rectangle-mark-mode followed by another kill command that appends the killed text", async () => {
    setEmptyCursors(activeTextEditor, [1, 2]);
    const killRing = new KillRing(3);
    const emulator = new EmacsEmulator(activeTextEditor, killRing);

    emulator.rectangleMarkMode();

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");

    assert.deepStrictEqual(activeTextEditor.selections, [
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
KLMNOPQRST`,
    );

    assert.deepStrictEqual(activeTextEditor.selections, [new vscode.Selection(3, 2, 3, 2)]);

    await delay(); // Wait for all related event listeners to have been called

    await emulator.runCommand("killLine");

    assertTextEqual(
      activeTextEditor,
      `0123456789
abefghij
ABEFGHIJ
kl
KLMNOPQRST`,
    );

    // Yank the killed text in the rect-mark-mode.
    // The text is yanked as a rectangle and automatically indented.
    setEmptyCursors(activeTextEditor, [4, 2]);
    await emulator.runCommand("yank");
    assertTextEqual(
      activeTextEditor,
      `0123456789
abefghij
ABEFGHIJ
kl
KLcdMNOPQRST
  CD
  mnopqrst`,
    );
  });

  test("killing in rectangle-mark-mode followed by multiple kill command that append killed texts including multiple lines", async () => {
    setEmptyCursors(activeTextEditor, [0, 8]);
    const killRing = new KillRing(3);
    const emulator = new EmacsEmulator(activeTextEditor, killRing);

    emulator.rectangleMarkMode();

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");

    assert.deepStrictEqual(activeTextEditor.selections, [
      new vscode.Selection(0, 8, 0, 10),
      new vscode.Selection(1, 8, 1, 10),
      new vscode.Selection(2, 8, 2, 10),
    ]);

    await emulator.runCommand("killRegion");

    assertTextEqual(
      activeTextEditor,
      `01234567
abcdefgh
ABCDEFGH
klmnopqrst
KLMNOPQRST`,
    );

    assert.deepStrictEqual(activeTextEditor.selections, [new vscode.Selection(2, 8, 2, 8)]);

    await delay(); // Wait for all related event listeners to have been called

    await emulator.runCommand("killLine");
    await emulator.runCommand("killLine");
    await emulator.runCommand("killLine");

    assertTextEqual(
      activeTextEditor,
      `01234567
abcdefgh
ABCDEFGHKLMNOPQRST`,
    );

    // Yank the killed text in the rect-mark-mode.
    // The text is yanked as a rectangle and automatically indented.
    setEmptyCursors(activeTextEditor, [2, 1]);
    await emulator.runCommand("yank");
    assertTextEqual(
      activeTextEditor,
      `01234567
abcdefgh
A89BCDEFGHKLMNOPQRST
 ij
 IJ
klmnopqrst
`,
    );
  });

  test("killing in rectangle-mark-mode followed by multiple kill command that append killed texts including multiple lines, then yanking the killed text to a buffer with an enough number of lines", async () => {
    setEmptyCursors(activeTextEditor, [0, 8]);
    const killRing = new KillRing(3);
    const emulator = new EmacsEmulator(activeTextEditor, killRing);

    emulator.rectangleMarkMode();

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");

    assert.deepStrictEqual(activeTextEditor.selections, [
      new vscode.Selection(0, 8, 0, 10),
      new vscode.Selection(1, 8, 1, 10),
      new vscode.Selection(2, 8, 2, 10),
    ]);

    await emulator.runCommand("killRegion");

    assertTextEqual(
      activeTextEditor,
      `01234567
abcdefgh
ABCDEFGH
klmnopqrst
KLMNOPQRST`,
    );

    assert.deepStrictEqual(activeTextEditor.selections, [new vscode.Selection(2, 8, 2, 8)]);

    await delay(); // Wait for all related event listeners to have been called

    await emulator.runCommand("killLine");
    await emulator.runCommand("killLine");
    await emulator.runCommand("killLine");

    assertTextEqual(
      activeTextEditor,
      `01234567
abcdefgh
ABCDEFGHKLMNOPQRST`,
    );

    // Yank the killed text in the rect-mark-mode.
    // The text is yanked as a rectangle and automatically indented.
    clearTextEditor(activeTextEditor, "\n".repeat(10));
    await delay(100);
    setEmptyCursors(activeTextEditor, [2, 0]);
    assert.deepStrictEqual(activeTextEditor.selections, [new vscode.Selection(2, 0, 2, 0)]);
    await emulator.runCommand("yank");
    assertTextEqual(
      activeTextEditor,
      `

89
ij
IJ
klmnopqrst






`,
    );
  });

  test("Killing a region including empty lines", async () => {
    await clearTextEditor(
      activeTextEditor,
      `0123456789

abcdefghij

ABCDEFGHIJ

klmnopqrst

KLMNOPQRST`,
    );

    setEmptyCursors(activeTextEditor, [0, 2]);

    const killRing = new KillRing(3);
    const emulator = new EmacsEmulator(activeTextEditor, killRing);

    emulator.rectangleMarkMode();
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");

    assert.deepStrictEqual(activeTextEditor.selections, [
      new vscode.Selection(0, 2, 0, 4),
      new vscode.Selection(1, 0, 1, 0),
      new vscode.Selection(2, 2, 2, 4),
      new vscode.Selection(3, 0, 3, 0),
      new vscode.Selection(4, 2, 4, 4),
      new vscode.Selection(5, 0, 5, 0),
    ]);

    await emulator.runCommand("killRegion");

    assertTextEqual(
      activeTextEditor,
      `01456789

abefghij

ABEFGHIJ

klmnopqrst

KLMNOPQRST`,
    );

    await clearTextEditor(activeTextEditor, "");
    await emulator.runCommand("yank");
    assertTextEqual(
      activeTextEditor,
      `23
  
cd
  
CD
  `,
    );
  });

  test("typing a character in rectangle-mark-mode", async () => {
    setEmptyCursors(activeTextEditor, [1, 2]);
    const emulator = new EmacsEmulator(activeTextEditor);

    emulator.rectangleMarkMode();

    assert.deepStrictEqual(activeTextEditor.selections, [new vscode.Selection(1, 2, 1, 2)]);

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");

    assert.deepStrictEqual(activeTextEditor.selections, [
      new vscode.Selection(1, 2, 1, 4),
      new vscode.Selection(2, 2, 2, 4),
    ]);

    await emulator.typeChar("x");

    await delay(); // Wait for all related event listeners to have been called

    assert.deepStrictEqual(activeTextEditor.selections, [new vscode.Selection(2, 5, 2, 5)]);
    assert.strictEqual(
      activeTextEditor.document.getText(),
      `0123456789
abcdefghij
ABCDxEFGHIJ
klmnopqrst
KLMNOPQRST`,
    );
  });
});
