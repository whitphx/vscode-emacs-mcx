import * as vscode from "vscode";
import assert from "assert";
import {
  cleanUpWorkspace,
  setEmptyCursors,
  setupWorkspace,
  delay,
  assertTextEqual,
  clearTextEditor,
  createEmulator,
  assertCursorsEqual,
  assertSelectionsEqual,
} from "./utils";
import { KillRing } from "../../kill-yank/kill-ring";
import { Configuration } from "../../configuration/configuration";

// cSpell:words klmnopqrst abefghij klopqrst mnopqrst ABCDEFGHKLMNOPQRST BCDEFGHKLMNOPQRST EFGHIJ

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
    const emulator = createEmulator(activeTextEditor);

    await emulator.rectangleMarkMode();

    assertSelectionsEqual(activeTextEditor, [1, 2, 1, 2]);

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");

    assertSelectionsEqual(activeTextEditor, [1, 2, 1, 4], [2, 2, 2, 4]);

    await emulator.rectangleMarkMode();

    assertSelectionsEqual(activeTextEditor, [1, 2, 2, 4]);

    await emulator.rectangleMarkMode();

    assertSelectionsEqual(activeTextEditor, [1, 2, 1, 4], [2, 2, 2, 4]);

    await emulator.cancel();

    assertSelectionsEqual(activeTextEditor, [2, 4, 2, 4]);
  });

  test("expanding the rect from right bottom to left top and toggling rectangle-mark-mode", async () => {
    setEmptyCursors(activeTextEditor, [2, 4]);
    const emulator = createEmulator(activeTextEditor);

    await emulator.rectangleMarkMode();

    assertSelectionsEqual(activeTextEditor, [2, 4, 2, 4]);

    await emulator.runCommand("backwardChar");
    await emulator.runCommand("backwardChar");
    await emulator.runCommand("previousLine");

    assertSelectionsEqual(activeTextEditor, [2, 4, 2, 2], [1, 4, 1, 2]);

    await emulator.rectangleMarkMode();

    assertSelectionsEqual(activeTextEditor, [2, 4, 1, 2]);

    await emulator.rectangleMarkMode();

    assertSelectionsEqual(activeTextEditor, [2, 4, 2, 2], [1, 4, 1, 2]);
    await emulator.cancel();

    assertSelectionsEqual(activeTextEditor, [1, 2, 1, 2]);
  });

  test("killing and yanking in rectangle-mark-mode", async () => {
    setEmptyCursors(activeTextEditor, [1, 2]);
    const killRing = new KillRing(3);
    const emulator = createEmulator(activeTextEditor, killRing);

    await emulator.rectangleMarkMode();

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");

    assertSelectionsEqual(activeTextEditor, [1, 2, 1, 4], [2, 2, 2, 4], [3, 2, 3, 4]);

    await emulator.runCommand("killRegion");

    assertTextEqual(
      activeTextEditor,
      `0123456789
abefghij
ABEFGHIJ
klopqrst
KLMNOPQRST`,
    );

    assertSelectionsEqual(activeTextEditor, [3, 2, 3, 2]);

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
    const emulator = createEmulator(activeTextEditor, killRing);

    await emulator.rectangleMarkMode();

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");

    assertSelectionsEqual(activeTextEditor, [1, 2, 1, 4], [2, 2, 2, 4], [3, 2, 3, 4]);

    await emulator.runCommand("killRegion");

    assertTextEqual(
      activeTextEditor,
      `0123456789
abefghij
ABEFGHIJ
klopqrst
KLMNOPQRST`,
    );

    assertSelectionsEqual(activeTextEditor, [3, 2, 3, 2]);

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
    const emulator = createEmulator(activeTextEditor, killRing);

    await emulator.rectangleMarkMode();

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");

    assertSelectionsEqual(activeTextEditor, [0, 8, 0, 10], [1, 8, 1, 10], [2, 8, 2, 10]);

    await emulator.runCommand("killRegion");

    assertTextEqual(
      activeTextEditor,
      `01234567
abcdefgh
ABCDEFGH
klmnopqrst
KLMNOPQRST`,
    );

    assertSelectionsEqual(activeTextEditor, [2, 8, 2, 8]);

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
    const emulator = createEmulator(activeTextEditor, killRing);

    await emulator.rectangleMarkMode();

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");

    assertSelectionsEqual(activeTextEditor, [0, 8, 0, 10], [1, 8, 1, 10], [2, 8, 2, 10]);

    await emulator.runCommand("killRegion");

    assertTextEqual(
      activeTextEditor,
      `01234567
abcdefgh
ABCDEFGH
klmnopqrst
KLMNOPQRST`,
    );

    assertSelectionsEqual(activeTextEditor, [2, 8, 2, 8]);

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
    await clearTextEditor(activeTextEditor, "\n".repeat(10));
    setEmptyCursors(activeTextEditor, [2, 0]);
    assertCursorsEqual(activeTextEditor, [2, 0]);
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
    const emulator = createEmulator(activeTextEditor, killRing);

    await emulator.rectangleMarkMode();
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");

    assertSelectionsEqual(
      activeTextEditor,
      [0, 2, 0, 4],
      [1, 0, 1, 0],
      [2, 2, 2, 4],
      [3, 0, 3, 0],
      [4, 2, 4, 4],
      [5, 0, 5, 0],
    );

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

  test("yanking in rectangle-mark-mode exits the mode before yanking", async () => {
    setEmptyCursors(activeTextEditor, [1, 2]);
    const killRing = new KillRing(3);
    const emulator = createEmulator(activeTextEditor, killRing);

    await emulator.rectangleMarkMode();

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");

    assertSelectionsEqual(activeTextEditor, [1, 2, 1, 4], [2, 2, 2, 4], [3, 2, 3, 4]);

    await emulator.runCommand("killRegion");

    assertTextEqual(
      activeTextEditor,
      `0123456789
abefghij
ABEFGHIJ
klopqrst
KLMNOPQRST`,
    );

    assertCursorsEqual(activeTextEditor, [3, 2]);
    assert.strictEqual(emulator.inRectMarkMode, false);

    // Move the cursor to (2, 0)
    await emulator.runCommand("backwardChar");
    await emulator.runCommand("backwardChar");
    await emulator.runCommand("previousLine");
    assertCursorsEqual(activeTextEditor, [2, 0]);
    // Then enter the rect-mark-mode again and expand the selection to (4,2)
    await emulator.rectangleMarkMode();
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("nextLine");
    assertSelectionsEqual(
      activeTextEditor,
      [2, 0, 2, 2],
      [3, 0, 3, 2],
      [4, 0, 4, 2], // The active cursor is at (4,2)
    );
    // Yank the text killed in the rect-mark-mode, in the rect-mark-mode.
    // The mark-mode is exited before yanking.
    // The text is yanked as a rectangle and automatically indented.
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
    assert.strictEqual(emulator.inRectMarkMode, false);
  });

  test("typing a character in rectangle-mark-mode", async () => {
    setEmptyCursors(activeTextEditor, [1, 2]);
    const emulator = createEmulator(activeTextEditor);

    await emulator.rectangleMarkMode();

    assertSelectionsEqual(activeTextEditor, [1, 2, 1, 2]);

    await emulator.runCommand("forwardChar");
    await emulator.runCommand("forwardChar");
    await emulator.runCommand("nextLine");

    assertSelectionsEqual(activeTextEditor, [1, 2, 1, 4], [2, 2, 2, 4]);

    await emulator.typeChar("x");

    await delay(); // Wait for all related event listeners to have been called

    assertSelectionsEqual(activeTextEditor, [2, 5, 2, 5]);
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

suite("RectangleMarkMode with word-based movement", () => {
  let activeTextEditor: vscode.TextEditor;

  setup(async () => {
    const initialText = `lorem ipsum dolor sit amet,
consectetur adipiscing elit.
Sed do eiusmod tempor incididunt
ut labore et dolore magna aliqua.
Ut enim ad minim veniam,
quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`;
    activeTextEditor = await setupWorkspace(initialText);
  });

  setup(() => {
    Configuration.instance.wordNavigationStyle = "emacs";
  });

  teardown(() => {
    Configuration.reload();
  });

  teardown(cleanUpWorkspace);

  test("expanding the rect with forwardWord", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]);
    const emulator = createEmulator(activeTextEditor);

    await emulator.rectangleMarkMode();

    assertSelectionsEqual(activeTextEditor, [0, 2, 0, 2]);

    await emulator.runCommand("forwardWord");
    await emulator.runCommand("forwardWord");
    await emulator.runCommand("nextLine");
    await emulator.runCommand("forwardWord");

    assertSelectionsEqual(activeTextEditor, [0, 2, 0, 22], [1, 2, 1, 22]);
  });

  test("expanding the rect with backwardWord", async () => {
    setEmptyCursors(activeTextEditor, [2, 26]);
    const emulator = createEmulator(activeTextEditor);

    await emulator.rectangleMarkMode();

    assertSelectionsEqual(activeTextEditor, [2, 26, 2, 26]);

    await emulator.runCommand("backwardWord");
    await emulator.runCommand("backwardWord");
    await emulator.runCommand("previousLine");
    await emulator.runCommand("backwardWord");

    assertSelectionsEqual(activeTextEditor, [2, 26, 2, 12], [1, 26, 1, 12]);
  });
});
