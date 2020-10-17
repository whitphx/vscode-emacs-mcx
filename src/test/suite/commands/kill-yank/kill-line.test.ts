import * as assert from "assert";
import * as vscode from "vscode";
import { Position, Range } from "vscode";
import { Configuration } from "../../../../configuration/configuration";
import { moveCommandIds } from "../../../../commands/move";
import { EmacsEmulator } from "../../../../emulator";
import { KillRing } from "../../../../kill-yank/kill-ring";
import {
  assertTextEqual,
  assertCursorsEqual,
  cleanUpWorkspace,
  clearTextEditor,
  setEmptyCursors,
  setupWorkspace,
} from "../../utils";

suite("killLine", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
    activeTextEditor = await setupWorkspace(initialText);
  });

  teardown(cleanUpWorkspace);

  suite("without KillRing", () => {
    setup(() => {
      emulator = new EmacsEmulator(activeTextEditor);
    });

    test("it cuts the current line", async () => {
      setEmptyCursors(activeTextEditor, [1, 1]); // Line_1

      await emulator.runCommand("killLine");

      assert.equal(
        activeTextEditor.document.getText(),
        `0123456789
a
ABCDEFGHIJ`
      );

      clearTextEditor(activeTextEditor);

      setEmptyCursors(activeTextEditor, [0, 0]);
      await emulator.runCommand("yank");

      assertTextEqual(activeTextEditor, "bcdefghij");
    });

    test("it removes line break if invoked at the end of line", async () => {
      setEmptyCursors(activeTextEditor, [1, 10]);
      await emulator.runCommand("killLine");

      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdefghijABCDEFGHIJ`
      );

      clearTextEditor(activeTextEditor);

      setEmptyCursors(activeTextEditor, [0, 0]);
      await emulator.runCommand("yank");

      assertTextEqual(activeTextEditor, "\n");
    });

    test("it works with multi cursor", async () => {
      setEmptyCursors(activeTextEditor, [1, 1], [0, 1], [2, 1]);

      await emulator.runCommand("killLine");

      assertTextEqual(
        activeTextEditor,
        `0
a
A`
      );

      clearTextEditor(activeTextEditor);

      setEmptyCursors(activeTextEditor, [0, 0]);
      await emulator.runCommand("yank");

      assertTextEqual(
        activeTextEditor,
        `123456789
bcdefghij
BCDEFGHIJ`
      );
    });
  });

  suite("with KillRing", () => {
    setup(() => {
      const killRing = new KillRing(3);
      emulator = new EmacsEmulator(activeTextEditor, killRing);
    });

    test("it appends killed text if invoked continuously", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      await emulator.runCommand("killLine"); // 1st line
      await emulator.runCommand("killLine"); // EOL of 1st
      await emulator.runCommand("killLine"); // 2nd line
      await emulator.runCommand("killLine"); // EOL of 2nd

      clearTextEditor(activeTextEditor);

      setEmptyCursors(activeTextEditor, [0, 0]);
      await emulator.runCommand("yank");

      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdefghij
`
      );
    });

    // Test kill appending is not enabled after cursorMove or some other commands
    const otherInterruptingCommands = ["editor.action.selectAll"];

    const interruptingCommands: string[] = [...otherInterruptingCommands];
    interruptingCommands.forEach((interruptingCommand) => {
      test(`it does not appends killed text if another command (${interruptingCommand}) invoked`, async () => {
        setEmptyCursors(activeTextEditor, [1, 5]);

        await emulator.runCommand("killLine"); // 2st line
        await emulator.runCommand("killLine"); // EOL of 2st

        await vscode.commands.executeCommand(interruptingCommand); // Interrupt

        await emulator.runCommand("killLine"); // 3nd line
        await emulator.runCommand("killLine"); // EOL of 3nd (no effect)

        await clearTextEditor(activeTextEditor);

        setEmptyCursors(activeTextEditor, [0, 0]);
        await emulator.runCommand("yank");

        assert.ok(
          !activeTextEditor.document.getText().includes("fghij\n") // First 2 kills does not appear here
        );
        await emulator.runCommand("yankPop");
        assert.equal(activeTextEditor.document.getText(), "fghij\n"); // First 2 kills appear here
      });
    });

    // Test kill appending is not enabled after cursorMoves, editing, or some other ops
    const moves = moveCommandIds.map((commandName): [string, () => Thenable<unknown> | undefined] => [
      commandName,
      () => emulator.runCommand(commandName),
    ]);
    const edits: Array<[string, () => Thenable<unknown>]> = [
      ["edit", () => activeTextEditor.edit((editBuilder) => editBuilder.insert(new Position(0, 0), "hoge"))],
      [
        "delete",
        () =>
          activeTextEditor.edit((editBuilder) => editBuilder.delete(new Range(new Position(0, 0), new Position(0, 1)))),
      ],
      [
        "replace",
        () =>
          activeTextEditor.edit((editBuilder) =>
            editBuilder.replace(new Range(new Position(0, 0), new Position(0, 1)), "hoge")
          ),
      ],
    ];
    const otherOps: Array<[string, () => Thenable<unknown>]> = [["cancel", async () => await emulator.cancel()]];

    const ops: Array<[string, () => Thenable<unknown> | undefined]> = [...moves, ...edits, ...otherOps];
    ops.forEach(([label, op]) => {
      test(`it does not append the killed text after ${label}`, async () => {
        setEmptyCursors(activeTextEditor, [1, 5]);

        await emulator.runCommand("killLine"); // 2st line
        await emulator.runCommand("killLine"); // EOL of 2st

        await op(); // Interrupt

        await emulator.runCommand("killLine"); // 3nd line
        await emulator.runCommand("killLine"); // EOL of 3nd (no effect)

        await clearTextEditor(activeTextEditor);

        setEmptyCursors(activeTextEditor, [0, 0]);
        await emulator.runCommand("yank");

        assert.ok(
          !activeTextEditor.document.getText().includes("fghij\n") // First 2 kills does not appear here
        );
        await emulator.runCommand("yankPop");
        assert.equal(activeTextEditor.document.getText(), "fghij\n"); // First 2 kills appear here
      });
    });
  });

  suite("when prefix argument specified", () => {
    setup(() => {
      emulator = new EmacsEmulator(activeTextEditor);
    });

    test("it kills multiple lines and does not leave a blank line (in case the cursor is at the beginning of the line)", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      emulator.universalArgument();
      await emulator.universalArgumentDigit(2);

      await emulator.runCommand("killLine");

      assertTextEqual(activeTextEditor, `ABCDEFGHIJ`);
      assert.equal(activeTextEditor.selections.length, 1);
      assertCursorsEqual(activeTextEditor, [0, 0]);

      await clearTextEditor(activeTextEditor);

      await emulator.runCommand("yank");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdefghij
`
      );
    });

    test("it works in the same way to the default (in case the cursor is NOT at the beginning of the line)", async () => {
      setEmptyCursors(activeTextEditor, [0, 1]);

      emulator.universalArgument();
      await emulator.universalArgumentDigit(2);

      await emulator.runCommand("killLine");

      assertTextEqual(activeTextEditor, `0ABCDEFGHIJ`);
      assert.equal(activeTextEditor.selections.length, 1);
      assertCursorsEqual(activeTextEditor, [0, 1]);

      await clearTextEditor(activeTextEditor);

      await emulator.runCommand("yank");
      assertTextEqual(
        activeTextEditor,
        `123456789
abcdefghij
`
      );
    });
  });
});

suite("killLine with kill-whole-line option", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
    activeTextEditor = await setupWorkspace(initialText);

    Configuration.instance.killWholeLine = true;
  });

  teardown(() => {
    Configuration.reload();
    return cleanUpWorkspace();
  });

  suite("without KillRing", () => {
    setup(() => {
      emulator = new EmacsEmulator(activeTextEditor);
    });

    test("it cuts the current line with RET if the cursor is the the beginning of the line", async () => {
      setEmptyCursors(activeTextEditor, [1, 0]); // the beginning of Line_1

      await emulator.runCommand("killLine");

      assert.equal(
        activeTextEditor.document.getText(),
        `0123456789
ABCDEFGHIJ`
      );

      clearTextEditor(activeTextEditor);

      setEmptyCursors(activeTextEditor, [0, 0]);
      await emulator.runCommand("yank");

      assertTextEqual(activeTextEditor, "abcdefghij\n");
    });

    test("it works in the same way to the default if the cursor is not the the beginning of the line", async () => {
      setEmptyCursors(activeTextEditor, [1, 1]); // the beginning of Line_1

      await emulator.runCommand("killLine");

      assert.equal(
        activeTextEditor.document.getText(),
        `0123456789
a
ABCDEFGHIJ`
      );

      clearTextEditor(activeTextEditor);

      setEmptyCursors(activeTextEditor, [0, 0]);
      await emulator.runCommand("yank");

      assertTextEqual(activeTextEditor, "bcdefghij");
    });
  });

  suite("when prefix argument specified", () => {
    setup(() => {
      emulator = new EmacsEmulator(activeTextEditor);
    });

    test("it works in the same way to the default (in case the cursor is at the beginning of the line)", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      emulator.universalArgument();
      await emulator.universalArgumentDigit(2);

      await emulator.runCommand("killLine");

      assertTextEqual(activeTextEditor, `ABCDEFGHIJ`);
      assert.equal(activeTextEditor.selections.length, 1);
      assertCursorsEqual(activeTextEditor, [0, 0]);

      await clearTextEditor(activeTextEditor);

      await emulator.runCommand("yank");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdefghij
`
      );
    });

    test("it works in the same way to the default (in case the cursor is NOT at the beginning of the line)", async () => {
      setEmptyCursors(activeTextEditor, [0, 1]);

      emulator.universalArgument();
      await emulator.universalArgumentDigit(2);

      await emulator.runCommand("killLine");

      assertTextEqual(activeTextEditor, `0ABCDEFGHIJ`);
      assert.equal(activeTextEditor.selections.length, 1);
      assertCursorsEqual(activeTextEditor, [0, 1]);

      await clearTextEditor(activeTextEditor);

      await emulator.runCommand("yank");
      assertTextEqual(
        activeTextEditor,
        `123456789
abcdefghij
`
      );
    });
  });
});
