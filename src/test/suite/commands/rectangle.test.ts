import * as vscode from "vscode";
import assert from "assert";
import { EmacsEmulator } from "../../../emulator";
import {
  assertTextEqual,
  cleanUpWorkspace,
  setEmptyCursors,
  assertCursorsEqual,
  setupWorkspace,
  assertSelectionsEqual,
} from "../utils";
import { KillRing } from "../../../kill-yank/kill-ring";
import { Minibuffer } from "src/minibuffer";

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
KLMNOPQRST`,
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
KLMNOPQRST`,
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
     DEFG`,
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
     DEFG DEFG`,
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
KLMNOPQRST`,
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
KLMNOPQRST`,
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
KLMNOPQRST`,
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
KLMNOPQRST`,
    );
  });

  test("copy and yank a rectangle", async () => {
    activeTextEditor.selections = [new vscode.Selection(0, 3, 2, 7)];
    await emulator.runCommand("copyRectangleAsKill");
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [2, 7]);
    assert.equal(emulator.isInMarkMode, false);

    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("yankRectangle");
    assertTextEqual(
      activeTextEditor,
      `34560123456789
defgabcdefghij
DEFGABCDEFGHIJ
klmnopqrst
KLMNOPQRST`,
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
KLMNOPQRST`,
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
KLMNOPQRST`,
    );
    assertCursorsEqual(activeTextEditor, [2, 5], [3, 9]);
  });
});

suite("string-rectangle", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  class MockMinibuffer implements Minibuffer {
    returnValue: string | undefined;

    constructor(returnValue: string | undefined) {
      this.returnValue = returnValue;
    }

    public get isReading(): boolean {
      return true;
    }

    public paste(): void {
      return;
    }

    public readFromMinibuffer(): Promise<string | undefined> {
      return Promise.resolve(this.returnValue);
    }
  }

  const initialText = `0123456789
abcdefghij
ABCDEFGHIJ
klmnopqrst
KLMNOPQRST`;
  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor, null, new MockMinibuffer("foo"));
  });

  teardown(cleanUpWorkspace);

  // XXX: The behavior is different from the original Emacs when the selections are empty.
  test("nothing happens when the selection is empty", async () => {
    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator.runCommand("stringRectangle");
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [1, 5]);
  });

  // XXX: The behavior is different from the original Emacs when the selections are empty.
  test("nothing happens when the selections are empty", async () => {
    setEmptyCursors(activeTextEditor, [1, 5], [2, 7]);
    await emulator.runCommand("stringRectangle");
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [1, 5], [2, 7]);
  });

  test("replacing the rectangle with a text input from minibuffer", async () => {
    activeTextEditor.selections = [new vscode.Selection(0, 3, 2, 7)];
    await emulator.runCommand("stringRectangle");
    assertTextEqual(
      activeTextEditor,
      `012foo789
abcfoohij
ABCfooHIJ
klmnopqrst
KLMNOPQRST`,
    );
    assertCursorsEqual(activeTextEditor, [2, 6]);
  });

  test("replacing the rectangles with a text input from minibuffer", async () => {
    activeTextEditor.selections = [new vscode.Selection(0, 3, 2, 5), new vscode.Selection(2, 7, 3, 9)];
    await emulator.runCommand("stringRectangle");
    assertTextEqual(
      activeTextEditor,
      `012foo56789
abcfoofghij
ABCfooFGfooJ
klmnopqfoot
KLMNOPQRST`,
    );
    assertCursorsEqual(activeTextEditor, [2, 6], [3, 10]);
  });
});

suite("open-rectangle", () => {
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
    await emulator.runCommand("openRectangle");
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [1, 5]);
  });

  test("nothing happens when the selections are empty", async () => {
    setEmptyCursors(activeTextEditor, [1, 5], [2, 7]);
    await emulator.runCommand("openRectangle");
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [1, 5], [2, 7]);
  });

  test("opening a rectangle", async () => {
    activeTextEditor.selections = [new vscode.Selection(0, 3, 2, 7)];
    await emulator.runCommand("openRectangle");
    assertTextEqual(
      activeTextEditor,
      `012    3456789
abc    defghij
ABC    DEFGHIJ
klmnopqrst
KLMNOPQRST`,
    );
    assertCursorsEqual(activeTextEditor, [0, 3]);
  });

  test("opening rectangles", async () => {
    activeTextEditor.selections = [new vscode.Selection(0, 3, 2, 5), new vscode.Selection(2, 7, 3, 9)];
    await emulator.runCommand("openRectangle");
    assertTextEqual(
      activeTextEditor,
      `012  3456789
abc  defghij
ABC  DEFG  HIJ
klmnopq  rst
KLMNOPQRST`,
    );
    assertCursorsEqual(activeTextEditor, [0, 3], [2, 7]);
  });
});

suite("replace-killring-to-rectangle", () => {
  let activeTextEditor: vscode.TextEditor;
  let killring: KillRing;
  let emulator_no_killring: EmacsEmulator;
  let emulator_has_killring: EmacsEmulator;

  const initialText = `0123456789
abcdefghij
ABCDEFGHIJ
abc
klmnopqrst
KLMNOPQRST
<r>`;
  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText);
    emulator_no_killring = new EmacsEmulator(activeTextEditor, null);
    killring = new KillRing(3);
    emulator_has_killring = new EmacsEmulator(activeTextEditor, killring);
  });

  teardown(cleanUpWorkspace);

  test("nothing happens if no killring", async () => {
    const selection = new vscode.Selection(0, 4, 4, 4);
    activeTextEditor.selections = [selection];
    await emulator_no_killring.runCommand("replaceKillRingToRectangle");
    assertTextEqual(activeTextEditor, initialText);
    assertSelectionsEqual(activeTextEditor, selection);
  });

  test("nothing happens if killring is empty", async () => {
    const selection = new vscode.Selection(0, 4, 4, 4);
    activeTextEditor.selections = [selection];
    await emulator_has_killring.runCommand("replaceKillRingToRectangle");
    assertTextEqual(activeTextEditor, initialText);
    assertSelectionsEqual(activeTextEditor, selection);
  });

  test("nothing happens if killring has newline", async () => {
    const wholeFirstLine = `0123456789
`;
    const copySelection = new vscode.Selection(0, 0, 1, 0);
    activeTextEditor.selections = [copySelection];
    await emulator_has_killring.runCommand("copyRegion");
    assert.strictEqual(killring.getTop()?.asString(), wholeFirstLine);

    const selection = new vscode.Selection(0, 4, 4, 4);
    activeTextEditor.selections = [selection];
    await emulator_has_killring.runCommand("replaceKillRingToRectangle");
    assertTextEqual(activeTextEditor, initialText);
    assertSelectionsEqual(activeTextEditor, selection);

    assert.strictEqual(killring.getTop()?.asString(), wholeFirstLine);
  });

  test("nothing happens if selection is empty", async () => {
    const copySelection = new vscode.Selection(6, 0, 6, 3);
    activeTextEditor.selections = [copySelection];
    await emulator_has_killring.runCommand("copyRegion");
    assert.strictEqual(killring.getTop()?.asString(), "<r>");

    setEmptyCursors(activeTextEditor, [1, 5]);
    await emulator_has_killring.runCommand("replaceKillRingToRectangle");
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [1, 5]);

    assert.strictEqual(killring.getTop()?.asString(), "<r>");
  });

  test("nothing happens if selections are empty", async () => {
    const copySelection = new vscode.Selection(6, 0, 6, 3);
    activeTextEditor.selections = [copySelection];
    await emulator_has_killring.runCommand("copyRegion");
    assert.strictEqual(killring.getTop()?.asString(), "<r>");

    setEmptyCursors(activeTextEditor, [1, 5], [2, 7]);
    await emulator_has_killring.runCommand("replaceKillRingToRectangle");
    assertTextEqual(activeTextEditor, initialText);
    assertCursorsEqual(activeTextEditor, [1, 5], [2, 7]);

    assert.strictEqual(killring.getTop()?.asString(), "<r>");
  });

  test("multi selection are not supported", async () => {
    const copySelection = new vscode.Selection(6, 0, 6, 3);
    activeTextEditor.selections = [copySelection];
    await emulator_has_killring.runCommand("copyRegion");
    assert.strictEqual(killring.getTop()?.asString(), "<r>");

    const selection1 = new vscode.Selection(0, 4, 1, 4);
    const selection2 = new vscode.Selection(4, 4, 5, 4);
    activeTextEditor.selections = [selection1, selection2];
    await emulator_has_killring.runCommand("replaceKillRingToRectangle");

    assertTextEqual(activeTextEditor, initialText);
    assertSelectionsEqual(activeTextEditor, selection1, selection2);
  });

  test("replace-killring-to-rectangle, cursor bottom-right", async () => {
    const copySelection = new vscode.Selection(6, 0, 6, 3);
    activeTextEditor.selections = [copySelection];
    await emulator_has_killring.runCommand("copyRegion");
    assert.strictEqual(killring.getTop()?.asString(), "<r>");

    const selection = new vscode.Selection(0, 4, 4, 5);
    activeTextEditor.selections = [selection];
    await emulator_has_killring.runCommand("replaceKillRingToRectangle");

    assertTextEqual(
      activeTextEditor,
      `0123<r>56789
abcd<r>fghij
ABCD<r>FGHIJ
abc <r>
klmn<r>pqrst
KLMNOPQRST
<r>`,
    );

    assertCursorsEqual(activeTextEditor, [4, 7]);
    assert.strictEqual(killring.getTop()?.asString(), "<r>");
  });

  test("replace-killring-to-rectangle, cursor bottom-left", async () => {
    const copySelection = new vscode.Selection(6, 0, 6, 3);
    activeTextEditor.selections = [copySelection];
    await emulator_has_killring.runCommand("copyRegion");
    assert.strictEqual(killring.getTop()?.asString(), "<r>");

    const selection = new vscode.Selection(0, 5, 4, 4);
    activeTextEditor.selections = [selection];
    await emulator_has_killring.runCommand("replaceKillRingToRectangle");

    assertTextEqual(
      activeTextEditor,
      `0123<r>56789
abcd<r>fghij
ABCD<r>FGHIJ
abc <r>
klmn<r>pqrst
KLMNOPQRST
<r>`,
    );

    assertCursorsEqual(activeTextEditor, [4, 4]);
    assert.strictEqual(killring.getTop()?.asString(), "<r>");
  });

  test("replace-killring-to-rectangle, cursor upper-right", async () => {
    const copySelection = new vscode.Selection(6, 0, 6, 3);
    activeTextEditor.selections = [copySelection];
    await emulator_has_killring.runCommand("copyRegion");
    assert.strictEqual(killring.getTop()?.asString(), "<r>");

    const selection = new vscode.Selection(4, 4, 0, 5);
    activeTextEditor.selections = [selection];
    await emulator_has_killring.runCommand("replaceKillRingToRectangle");

    assertTextEqual(
      activeTextEditor,
      `0123<r>56789
abcd<r>fghij
ABCD<r>FGHIJ
abc <r>
klmn<r>pqrst
KLMNOPQRST
<r>`,
    );

    assertCursorsEqual(activeTextEditor, [0, 7]);
    assert.strictEqual(killring.getTop()?.asString(), "<r>");
  });

  test("replace-killring-to-rectangle, cursor upper-left", async () => {
    const copySelection = new vscode.Selection(6, 0, 6, 3);
    activeTextEditor.selections = [copySelection];
    await emulator_has_killring.runCommand("copyRegion");
    assert.strictEqual(killring.getTop()?.asString(), "<r>");

    const selection = new vscode.Selection(4, 5, 0, 4);
    activeTextEditor.selections = [selection];
    await emulator_has_killring.runCommand("replaceKillRingToRectangle");

    assertTextEqual(
      activeTextEditor,
      `0123<r>56789
abcd<r>fghij
ABCD<r>FGHIJ
abc <r>
klmn<r>pqrst
KLMNOPQRST
<r>`,
    );

    assertCursorsEqual(activeTextEditor, [0, 4]);
    assert.strictEqual(killring.getTop()?.asString(), "<r>");
  });

  test("replace-killring-to-0-width-rectangle, cursor upper-left", async () => {
    const copySelection = new vscode.Selection(6, 0, 6, 3);
    activeTextEditor.selections = [copySelection];
    await emulator_has_killring.runCommand("copyRegion");
    assert.strictEqual(killring.getTop()?.asString(), "<r>");

    const selection = new vscode.Selection(4, 4, 0, 4);
    activeTextEditor.selections = [selection];
    await emulator_has_killring.runCommand("replaceKillRingToRectangle");

    assertTextEqual(
      activeTextEditor,
      `0123<r>456789
abcd<r>efghij
ABCD<r>EFGHIJ
abc <r>
klmn<r>opqrst
KLMNOPQRST
<r>`,
    );

    assertCursorsEqual(activeTextEditor, [0, 7]);
    assert.strictEqual(killring.getTop()?.asString(), "<r>");
  });

  test("replace-killring-to-0-width-rectangle, cursor bottom-right", async () => {
    const copySelection = new vscode.Selection(6, 0, 6, 3);
    activeTextEditor.selections = [copySelection];
    await emulator_has_killring.runCommand("copyRegion");
    assert.strictEqual(killring.getTop()?.asString(), "<r>");

    const selection = new vscode.Selection(0, 4, 4, 4);
    activeTextEditor.selections = [selection];
    await emulator_has_killring.runCommand("replaceKillRingToRectangle");

    assertTextEqual(
      activeTextEditor,
      `0123<r>456789
abcd<r>efghij
ABCD<r>EFGHIJ
abc <r>
klmn<r>opqrst
KLMNOPQRST
<r>`,
    );

    assertCursorsEqual(activeTextEditor, [4, 7]);
    assert.strictEqual(killring.getTop()?.asString(), "<r>");
  });
});
