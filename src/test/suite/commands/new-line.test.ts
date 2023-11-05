import assert from "assert";
import * as vscode from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertTextEqual, cleanUpWorkspace, clearTextEditor, setEmptyCursors, setupWorkspace } from "../utils";

const eols: Array<[vscode.EndOfLine, string]> = [
  [vscode.EndOfLine.LF, "\n"],
  [vscode.EndOfLine.CRLF, "\r\n"],
];

eols.forEach(([eol, eolStr]) => {
  suite(`newLine with ${JSON.stringify(eolStr)}`, () => {
    let activeTextEditor: vscode.TextEditor;
    let emulator: EmacsEmulator;

    suite("basic behaviors", () => {
      setup(async () => {
        const initialText = `0123456789${eolStr}abcdefghij${eolStr}ABCDEFGHIJ`;
        activeTextEditor = await setupWorkspace(initialText, { eol });
        emulator = new EmacsEmulator(activeTextEditor);
      });

      teardown(cleanUpWorkspace);

      suite("single cursor in the middle line of the document", () => {
        const cursorLineNum = 1;

        test(`it works with single cursor at the beginning of the line`, async () => {
          setEmptyCursors(activeTextEditor, [cursorLineNum, 0]);

          await emulator.runCommand("newLine");

          assertTextEqual(activeTextEditor, `0123456789${eolStr}${eolStr}abcdefghij${eolStr}ABCDEFGHIJ`);
        });

        test(`it works with single cursor at the middle of the line`, async () => {
          setEmptyCursors(activeTextEditor, [cursorLineNum, 5]);

          await emulator.runCommand("newLine");

          assertTextEqual(activeTextEditor, `0123456789${eolStr}abcde${eolStr}fghij${eolStr}ABCDEFGHIJ`);
        });

        test(`it works with single cursor at the end of the line`, async () => {
          setEmptyCursors(activeTextEditor, [cursorLineNum, 10]);

          await emulator.runCommand("newLine");

          assertTextEqual(activeTextEditor, `0123456789${eolStr}abcdefghij${eolStr}${eolStr}ABCDEFGHIJ`);
        });
      });

      suite("single cursor in the last line of the document", () => {
        const cursorLineNum = 2;

        test(`it works with single cursor at the beginning of the line`, async () => {
          setEmptyCursors(activeTextEditor, [cursorLineNum, 0]);

          await emulator.runCommand("newLine");

          assertTextEqual(activeTextEditor, `0123456789${eolStr}abcdefghij${eolStr}${eolStr}ABCDEFGHIJ`);
        });

        test(`it works with single cursor at the middle of the line`, async () => {
          setEmptyCursors(activeTextEditor, [cursorLineNum, 5]);

          await emulator.runCommand("newLine");

          assertTextEqual(activeTextEditor, `0123456789${eolStr}abcdefghij${eolStr}ABCDE${eolStr}FGHIJ`);
        });

        test(`it works with single cursor at the end of the line`, async () => {
          setEmptyCursors(activeTextEditor, [cursorLineNum, 10]);

          await emulator.runCommand("newLine");

          assertTextEqual(activeTextEditor, `0123456789${eolStr}abcdefghij${eolStr}ABCDEFGHIJ${eolStr}`);
        });
      });

      suite("in mark-mode", () => {
        test("it cancels mark-mode and does NOT remove the selected text", async () => {
          // Set up mark-mode
          setEmptyCursors(activeTextEditor, [0, 0]);
          emulator.setMarkCommand();
          await emulator.runCommand("forwardChar");
          assert.ok(activeTextEditor.selections.every((selection) => !selection.isEmpty));

          // Test newLine
          await emulator.runCommand("newLine");

          assertTextEqual(activeTextEditor, `0${eolStr}123456789${eolStr}abcdefghij${eolStr}ABCDEFGHIJ`);

          assert.ok(activeTextEditor.selections.every((selection) => selection.isEmpty));

          // Then, next mark-mode works
          setEmptyCursors(activeTextEditor, [0, 0]);
          emulator.setMarkCommand();
          await emulator.runCommand("forwardChar");
          assert.ok(activeTextEditor.selections.every((selection) => !selection.isEmpty));
        });
      });
    });

    suite("with auto-indentation", () => {
      test("newLine preserves the indent", async () => {
        const initialText = "()";
        activeTextEditor = await setupWorkspace(initialText, { eol });
        activeTextEditor.options.tabSize = 4;
        emulator = new EmacsEmulator(activeTextEditor);

        setEmptyCursors(activeTextEditor, [0, 1]);

        await emulator.runCommand("newLine");

        assertTextEqual(activeTextEditor, `(${eolStr}    ${eolStr})`);
        assert.strictEqual(activeTextEditor.selection.active.line, 1);
        assert.strictEqual(activeTextEditor.selection.active.character, 4);
      });

      const languagesAutoDoc = [
        // "c", "cpp"  // Auto-indent for doc comments does not work with these languages in test env while I don't know why...
        "javascript",
        "javascriptreact",
        "typescript",
        "typescriptreact",
      ];
      languagesAutoDoc.forEach((language) => {
        test(`newLine does not disable the language specific control in case of ${language}`, async function () {
          const initialText = "/** */";

          // XXX: First, trigger the language's auto-indent feature without any assertion before the main test execution.
          // This is necessary for the test to be successful at VSCode 1.50.
          // It may be because the first execution warms up the language server.
          // TODO: Remove this workaround with later versions of VSCode
          activeTextEditor = await setupWorkspace(initialText, {
            eol,
            language,
          });
          emulator = new EmacsEmulator(activeTextEditor);

          setEmptyCursors(activeTextEditor, [0, 3]);

          await vscode.commands.executeCommand("default:type", { text: "\n" });
          await clearTextEditor(activeTextEditor);
          // XXX: (end of the workaround)

          activeTextEditor = await setupWorkspace(initialText, {
            eol,
            language,
          });
          emulator = new EmacsEmulator(activeTextEditor);

          setEmptyCursors(activeTextEditor, [0, 3]);

          await emulator.runCommand("newLine");

          assertTextEqual(activeTextEditor, `/**${eolStr} * ${eolStr} */`);
          assert.strictEqual(activeTextEditor.selection.active.line, 1);
          assert.strictEqual(activeTextEditor.selection.active.character, 3);
        });
      });
    });

    suite("without auto-indentation", () => {
      test("newLine preserves the indent", async () => {
        const initialText = "(a)";
        activeTextEditor = await setupWorkspace(initialText, { eol });
        activeTextEditor.options.tabSize = 4;
        emulator = new EmacsEmulator(activeTextEditor);

        setEmptyCursors(activeTextEditor, [0, 2]);

        await emulator.runCommand("newLine");

        assertTextEqual(activeTextEditor, `(a${eolStr})`);
        assert.strictEqual(activeTextEditor.selection.active.line, 1);
        assert.strictEqual(activeTextEditor.selection.active.character, 0);
      });
    });

    test("working with a prefix argument and undo/redo", async () => {
      const initialText = "";
      activeTextEditor = await setupWorkspace(initialText, { eol });
      emulator = new EmacsEmulator(activeTextEditor);

      setEmptyCursors(activeTextEditor, [0, 0]);

      await emulator.universalArgument();
      await emulator.runCommand("newLine");

      assertTextEqual(activeTextEditor, `${eolStr}${eolStr}${eolStr}${eolStr}`);
      assert.strictEqual(activeTextEditor.selection.active.line, 4);
      assert.strictEqual(activeTextEditor.selection.active.character, 0);

      await vscode.commands.executeCommand<void>("undo");

      assertTextEqual(activeTextEditor, initialText);

      await vscode.commands.executeCommand<void>("redo");

      assertTextEqual(activeTextEditor, `${eolStr}${eolStr}${eolStr}${eolStr}`);
    });

    suite("with auto-indentation with a prefix argument", () => {
      test("newLine preserves the indent", async () => {
        const initialText = "()";
        activeTextEditor = await setupWorkspace(initialText, { eol });
        activeTextEditor.options.tabSize = 4;
        emulator = new EmacsEmulator(activeTextEditor);

        setEmptyCursors(activeTextEditor, [0, 1]);

        await emulator.universalArgument();
        await emulator.runCommand("newLine");

        assertTextEqual(activeTextEditor, `(${eolStr}${eolStr}${eolStr}${eolStr}    ${eolStr})`);
        assert.strictEqual(activeTextEditor.selection.active.line, 4);
        assert.strictEqual(activeTextEditor.selection.active.character, 4);

        await vscode.commands.executeCommand<void>("undo");

        assertTextEqual(activeTextEditor, initialText);

        await vscode.commands.executeCommand<void>("redo");

        assertTextEqual(activeTextEditor, `(${eolStr}${eolStr}${eolStr}${eolStr}    ${eolStr})`);
      });

      const languagesAutoDoc = [
        // "c", "cpp"  // Auto-indent for doc comments does not work with these languages in test env while I don't know why...
        "javascript",
        "javascriptreact",
        "typescript",
        "typescriptreact",
      ];
      languagesAutoDoc.forEach((language) => {
        test(`newLine does not disable the language specific control in case of ${language}`, async function () {
          const initialText = "/** */";

          // XXX: First, trigger the language's auto-indent feature without any assertion before the main test execution.
          // This is necessary for the test to be successful at VSCode 1.50.
          // It may be because the first execution warms up the language server.
          // TODO: Remove this workaround with later versions of VSCode
          activeTextEditor = await setupWorkspace(initialText, {
            eol,
            language,
          });
          emulator = new EmacsEmulator(activeTextEditor);

          setEmptyCursors(activeTextEditor, [0, 3]);

          await vscode.commands.executeCommand("default:type", { text: "\n" });
          await clearTextEditor(activeTextEditor);
          // XXX: (end of the workaround)

          activeTextEditor = await setupWorkspace(initialText, {
            eol,
            language,
          });
          emulator = new EmacsEmulator(activeTextEditor);

          setEmptyCursors(activeTextEditor, [0, 3]);

          await emulator.universalArgument();
          await emulator.runCommand("newLine");

          assertTextEqual(activeTextEditor, `/**${eolStr} * ${eolStr} * ${eolStr} * ${eolStr} * ${eolStr} */`);
          assert.strictEqual(activeTextEditor.selection.active.line, 4);
          assert.strictEqual(activeTextEditor.selection.active.character, 3);

          await vscode.commands.executeCommand<void>("undo");

          assertTextEqual(activeTextEditor, initialText);

          await vscode.commands.executeCommand<void>("redo");

          assertTextEqual(activeTextEditor, `/**${eolStr} * ${eolStr} * ${eolStr} * ${eolStr} * ${eolStr} */`);
        });
      });
    });
  });
});
