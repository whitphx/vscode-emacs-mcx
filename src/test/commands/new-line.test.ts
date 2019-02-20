import * as assert from "assert";
import * as vscode from "vscode";
import { EmacsEmulator } from "../../emulator";
import { assertTextEqual, cleanUpWorkspace, setEmptyCursors, setupWorkspace } from "../utils";

suite("newLine", () => {
    let activeTextEditor: vscode.TextEditor;
    let emulator: EmacsEmulator;

    const eols: Array<[vscode.EndOfLine, string]> = [
        [vscode.EndOfLine.LF, "\n"],
        [vscode.EndOfLine.CRLF, "\r\n"],
    ];

    eols.forEach(([eol, eolStr]) => {
        suite(`with ${eolStr}`, () => {
            suite("basic behaviors", () => {
                setup(async () => {
                    const initialText = `0123456789${eolStr}abcdefghij${eolStr}ABCDEFGHIJ`;
                    activeTextEditor = await setupWorkspace(initialText, eol);
                    emulator = new EmacsEmulator(activeTextEditor);
                });

                teardown(cleanUpWorkspace);

                suite("single cursor in the middle line of the document", () => {
                    const cursorLineNum = 1;

                    test(`it works with single cursor at the beginning of the line`, async () => {
                        setEmptyCursors(activeTextEditor, [cursorLineNum, 0]);

                        await emulator.newLine();

                        assertTextEqual(
                            activeTextEditor,
                            `0123456789${eolStr}${eolStr}abcdefghij${eolStr}ABCDEFGHIJ`,
                        );
                    });

                    test(`it works with single cursor at the middle of the line`, async () => {
                        setEmptyCursors(activeTextEditor, [cursorLineNum, 5]);

                        await emulator.newLine();

                        assertTextEqual(
                            activeTextEditor,
                            `0123456789${eolStr}abcde${eolStr}fghij${eolStr}ABCDEFGHIJ`,
                        );
                    });

                    test(`it works with single cursor at the end of the line`, async () => {
                        setEmptyCursors(activeTextEditor, [cursorLineNum, 10]);

                        await emulator.newLine();

                        assertTextEqual(
                            activeTextEditor,
                            `0123456789${eolStr}abcdefghij${eolStr}${eolStr}ABCDEFGHIJ`,
                        );
                    });
                });

                suite("single cursor in the last line of the document", () => {
                    const cursorLineNum = 2;

                    test(`it works with single cursor at the beginning of the line`, async () => {
                        setEmptyCursors(activeTextEditor, [cursorLineNum, 0]);

                        await emulator.newLine();

                        assertTextEqual(
                            activeTextEditor,
                            `0123456789${eolStr}abcdefghij${eolStr}${eolStr}ABCDEFGHIJ`,
                        );
                    });

                    test(`it works with single cursor at the middle of the line`, async () => {
                        setEmptyCursors(activeTextEditor, [cursorLineNum, 5]);

                        await emulator.newLine();

                        assertTextEqual(
                            activeTextEditor,
                            `0123456789${eolStr}abcdefghij${eolStr}ABCDE${eolStr}FGHIJ`,
                        );
                    });

                    test(`it works with single cursor at the end of the line`, async () => {
                        setEmptyCursors(activeTextEditor, [cursorLineNum, 10]);

                        await emulator.newLine();

                        assertTextEqual(
                            activeTextEditor,
                            `0123456789${eolStr}abcdefghij${eolStr}ABCDEFGHIJ${eolStr}`,
                        );
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
                        await emulator.newLine();

                        assertTextEqual(activeTextEditor, `0${eolStr}123456789${eolStr}abcdefghij${eolStr}ABCDEFGHIJ`);

                        assert.ok(
                            activeTextEditor.selections.every((selection) => selection.isEmpty),
                        );

                        // Then, next mark-mode works
                        setEmptyCursors(activeTextEditor, [0, 0]);
                        emulator.setMarkCommand();
                        await emulator.runCommand("forwardChar");
                        assert.ok(activeTextEditor.selections.every((selection) => !selection.isEmpty));
                    });
                });
            });

            suite("with auto-indentation", () => {
                setup(async () => {
                    const initialText = "()";
                    activeTextEditor = await setupWorkspace(initialText, eol);
                    emulator = new EmacsEmulator(activeTextEditor);
                });

                teardown(cleanUpWorkspace);

                test("newLine preserves the indent", async () => {
                    setEmptyCursors(activeTextEditor, [0, 1]);

                    await emulator.newLine();

                    assertTextEqual(activeTextEditor, `(${eolStr}    ${eolStr})`);
                    assert.equal(activeTextEditor.selection.active.line, 1);
                    assert.equal(activeTextEditor.selection.active.character, 4);
                });
            });

            suite("without auto-indentation", () => {
                setup(async () => {
                    const initialText = "(a)";
                    activeTextEditor = await setupWorkspace(initialText, eol);
                    emulator = new EmacsEmulator(activeTextEditor);
                });

                teardown(cleanUpWorkspace);

                test("newLine preserves the indent", async () => {
                    setEmptyCursors(activeTextEditor, [0, 2]);

                    await emulator.newLine();

                    assertTextEqual(activeTextEditor, `(a${eolStr})`);
                    assert.equal(activeTextEditor.selection.active.line, 1);
                    assert.equal(activeTextEditor.selection.active.character, 0);
                });
            });
        });
    });
});
