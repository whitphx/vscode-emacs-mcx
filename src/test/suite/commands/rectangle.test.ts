import * as vscode from "vscode";
import * as expect from "expect";
import { EmacsEmulator } from "../../../emulator";
import { assertTextEqual, cleanUpWorkspace, setEmptyCursors, assertCursorsEqual, setupWorkspace } from "../utils";

suite("Kill, copy, and yank rectangle", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  const initialText = `0123456789
abcdefghij
ABCDEFGHIJ
klmnopqrst
KLMNOPQRST`;
  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("nothing happens when the selection is empty", async () => {
    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator.runCommand("killRectangle");
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [1, 5]);
  });

  test("nothing happens when the selections are empty", async () => {
    setEmptyCursors(activeTextEditor, [1, 5], [2, 7]);
    await emulator.runCommand("killRectangle");
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [1, 5], [2, 7]);
  });

  test("killing and yanking a rectangle", async () => {
    activeTextEditor.selections = [new vscode.Selection(0, 3, 2, 7)];
    await emulator.runCommand("killRectangle");
    assertTextEqual(
      activeTextEditor,
      `012789
abchij
ABCHIJ
klmnopqrst
KLMNOPQRST`
    );
    assertCursorsEqual(activeTextEditor, [2, 3]);

    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("yankRectangle");
    assertTextEqual(
      activeTextEditor,
      `3456012789
defgabchij
DEFGABCHIJ
klmnopqrst
KLMNOPQRST`
    );

    // Yank on an out-of-range area
    setEmptyCursors(activeTextEditor, [4, 5]);
    await emulator.runCommand("yankRectangle");
    assertTextEqual(
      activeTextEditor,
      `3456012789
defgabchij
DEFGABCHIJ
klmnopqrst
KLMNO3456PQRST
     defg
     DEFG`
    );

    setEmptyCursors(activeTextEditor, [4, 10]);
    await emulator.runCommand("yankRectangle");
    assertTextEqual(
      activeTextEditor,
      `3456012789
defgabchij
DEFGABCHIJ
klmnopqrst
KLMNO3456P3456QRST
     defg defg
     DEFG DEFG`
    );
  });

  test("deleting a rectangle", async () => {
    activeTextEditor.selections = [new vscode.Selection(0, 3, 2, 7)];
    await emulator.runCommand("deleteRectangle");
    assertTextEqual(
      activeTextEditor,
      `012789
abchij
ABCHIJ
klmnopqrst
KLMNOPQRST`
    );
    assertCursorsEqual(activeTextEditor, [2, 3]);

    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("yankRectangle"); // Nothing yanked as there is no killed rectangle.
    assertTextEqual(
      activeTextEditor,
      `012789
abchij
ABCHIJ
klmnopqrst
KLMNOPQRST`
    );
  });

  test("kill and yank with reversed range", async () => {
    activeTextEditor.selections = [new vscode.Selection(2, 7, 0, 3)]; // Rigth bottom to top left
    await emulator.runCommand("killRectangle");
    assertTextEqual(
      activeTextEditor,
      `012789
abchij
ABCHIJ
klmnopqrst
KLMNOPQRST`
    );
    assertCursorsEqual(activeTextEditor, [0, 3]);

    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("yankRectangle");
    assertTextEqual(
      activeTextEditor,
      `3456012789
defgabchij
DEFGABCHIJ
klmnopqrst
KLMNOPQRST`
    );
  });

  test("copy and yank a rectangle", async () => {
    activeTextEditor.selections = [new vscode.Selection(0, 3, 2, 7)];
    await emulator.runCommand("copyRectangleAsKill");
    assertTextEqual(activeTextEditor, initialText);
    expect(activeTextEditor.selections).toEqual([new vscode.Selection(0, 3, 2, 7)]); // The selection is not changed

    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("yankRectangle");
    assertTextEqual(
      activeTextEditor,
      `34560123456789
defgabcdefghij
DEFGABCDEFGHIJ
klmnopqrst
KLMNOPQRST`
    );
  });
});

suite("clear rectangle", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  const initialText = `0123456789
abcdefghij
ABCDEFGHIJ
klmnopqrst
KLMNOPQRST`;
  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("nothing happens when the selection is empty", async () => {
    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator.runCommand("clearRectangle");
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [1, 5]);
  });

  test("nothing happens when the selections are empty", async () => {
    setEmptyCursors(activeTextEditor, [1, 5], [2, 7]);
    await emulator.runCommand("clearRectangle");
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [1, 5], [2, 7]);
  });

  test("clearing a rectangle", async () => {
    activeTextEditor.selections = [new vscode.Selection(0, 3, 2, 7)];
    await emulator.runCommand("clearRectangle");
    assertTextEqual(
      activeTextEditor,
      `012    789
abc    hij
ABC    HIJ
klmnopqrst
KLMNOPQRST`
    );
    assertCursorsEqual(activeTextEditor, [2, 7]);
  });

  test("clearing rectangles", async () => {
    activeTextEditor.selections = [new vscode.Selection(0, 3, 2, 5), new vscode.Selection(2, 7, 3, 9)];
    await emulator.runCommand("clearRectangle");
    assertTextEqual(
      activeTextEditor,
      `012  56789
abc  fghij
ABC  FG  J
klmnopq  t
KLMNOPQRST`
    );
    assertCursorsEqual(activeTextEditor, [2, 5], [3, 9]);
  });
});
