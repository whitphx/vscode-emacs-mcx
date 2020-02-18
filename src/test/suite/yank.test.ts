import * as clipboardy from "clipboardy";
import * as vscode from "vscode";
import {Position, Selection} from "vscode";
import { EmacsEmulator } from "../../emulator";
import { assertTextEqual, cleanUpWorkspace, setupWorkspace} from "./utils";

suite("Emulator with yank", () => {
    let activeTextEditor: vscode.TextEditor;

    suite("with empty initial text", () => {
        setup(async () => {
            const initialText = "\n\n";  // 3 lines
            activeTextEditor = await setupWorkspace(initialText);
        });

        teardown(cleanUpWorkspace);

        suite("with a single line text in clipboard", () => {
            setup(() => {
                clipboardy.writeSync("Lorem ipsum");
            });

            test("it works with single cursor", async () => {
                const emulator = new EmacsEmulator(activeTextEditor);

                activeTextEditor.selections = [
                    new Selection(new Position(1, 0), new Position(1, 0)),
                ];

                await emulator.runCommand("yank");

                assertTextEqual(activeTextEditor, "\nLorem ipsum\n");
            });

            test("it works with multi cursor", async () => {
                const emulator = new EmacsEmulator(activeTextEditor);

                activeTextEditor.selections = [
                    new Selection(new Position(1, 0), new Position(1, 0)),
                    new Selection(new Position(0, 0), new Position(0, 0)),
                    new Selection(new Position(2, 0), new Position(2, 0)),
                ];

                await emulator.runCommand("yank");

                assertTextEqual(activeTextEditor, "Lorem ipsum\nLorem ipsum\nLorem ipsum");
            });
        });

        suite("with a multiple lines text in clipboard", () => {
            setup(() => {
                clipboardy.writeSync("Lorem ipsum\ndolor sit amet,");
            });

            test("it works with single cursor", async () => {
                const emulator = new EmacsEmulator(activeTextEditor);

                activeTextEditor.selections = [
                    new Selection(new Position(1, 0), new Position(1, 0)),
                ];

                await emulator.runCommand("yank");

                assertTextEqual(activeTextEditor, `
Lorem ipsum
dolor sit amet,
`);
            });

            test("it works with multi cursor", async () => {
                const emulator = new EmacsEmulator(activeTextEditor);

                activeTextEditor.selections = [
                    new Selection(new Position(1, 0), new Position(1, 0)),
                    new Selection(new Position(0, 0), new Position(0, 0)),
                    new Selection(new Position(2, 0), new Position(2, 0)),
                ];

                await emulator.runCommand("yank");

                assertTextEqual(
                    activeTextEditor,
                    `Lorem ipsum
dolor sit amet,
Lorem ipsum
dolor sit amet,
Lorem ipsum
dolor sit amet,`,
                    );
            });

            test("it works with same number multi cursor", async () => {
                const emulator = new EmacsEmulator(activeTextEditor);

                // 2 selections: the same line number to the text on clipboard
                activeTextEditor.selections = [
                    new Selection(new Position(1, 0), new Position(1, 0)),
                    new Selection(new Position(0, 0), new Position(0, 0)),
                ];

                await emulator.runCommand("yank");

                // Just single paste
                assertTextEqual(
                    activeTextEditor,
                    `Lorem ipsum
dolor sit amet,
`,
                    );
            });
        });

    });

    suite("with non-empty initial text", () => {
        setup(async () => {
            const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
            activeTextEditor = await setupWorkspace(initialText);
        });

        teardown(cleanUpWorkspace);

        suite("with a single line text in clipboard", () => {
            setup(() => {
                clipboardy.writeSync("Lorem ipsum");
            });

            test("it works with single non-empty cursor (selected text are removed)", async () => {
                const emulator = new EmacsEmulator(activeTextEditor);

                activeTextEditor.selections = [
                    new Selection(new Position(1, 0), new Position(1, 4)),
                ];

                await emulator.runCommand("yank");

                assertTextEqual(
                    activeTextEditor,
                    `0123456789
Lorem ipsumefghij
ABCDEFGHIJ`,
                );
            });

            test("it works with multiple non-empty cursor (selected text are removed)", async () => {
                const emulator = new EmacsEmulator(activeTextEditor);

                activeTextEditor.selections = [
                    new Selection(new Position(1, 0), new Position(1, 3)),
                    new Selection(new Position(0, 3), new Position(0, 6)),
                    new Selection(new Position(2, 6), new Position(2, 9)),
                ];

                await emulator.runCommand("yank");

                assertTextEqual(
                    activeTextEditor,
                    `012Lorem ipsum6789
Lorem ipsumdefghij
ABCDEFLorem ipsumJ`,
                );
            });
        });
    });
});
