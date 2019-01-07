import * as assert from "assert";
import * as vscode from "vscode";
import {Position, Selection} from "vscode";
import { EmacsEmulator } from "../emulator";
import { cleanUpWorkspace, clearTextEditor, setupWorkspace} from "./utils";

suite("Emulator with text editing", () => {
    let activeTextEditor: vscode.TextEditor;
    let emulator: EmacsEmulator;

    setup(async () => {
        const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
        activeTextEditor = await setupWorkspace(initialText);
        emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    suite("killRegion with yank", () => {
        test("it sorts ranges and aggregates the selected texts in order when multi cursor mode", async () => {
            // Select with multi cursor in not aligned order
            activeTextEditor.selections = [
                new Selection(new Position(1, 0), new Position(1, 3)),
                new Selection(new Position(0, 0), new Position(0, 3)),
                new Selection(new Position(2, 0), new Position(2, 3)),
            ];
            await emulator.killRegion();

            assert.equal(
                activeTextEditor.document.getText(),
                `3456789
defghij
DEFGHIJ`,
            );

            clearTextEditor(activeTextEditor);

            activeTextEditor.selections = [
                new Selection(new Position(0, 0), new Position(0, 0)),
            ];
            await emulator.yank();

            assert.equal(
                activeTextEditor.document.getText(),
                `012
abc
ABC`,
            );
        });

    });

    suite("killLine with yank", () => {
        test("it cuts the current line", async () => {
            activeTextEditor.selections = [
                new Selection(new Position(1, 1), new Position(1, 1)),  // Line_1
            ];

            await emulator.killLine();

            assert.equal(
                activeTextEditor.document.getText(),
                `0123456789
a
ABCDEFGHIJ`,
            );

            clearTextEditor(activeTextEditor);

            activeTextEditor.selections = [
                new Selection(new Position(0, 0), new Position(0, 0)),
            ];
            await emulator.yank();

            assert.equal(
                activeTextEditor.document.getText(),
                "bcdefghij",
            );
        });

        test("it removes line break if invoked at the end of line", async () => {
            activeTextEditor.selections = [
                new Selection(new Position(1, 10), new Position(1, 10)),  // at the end of line_1
            ];
            await emulator.killLine();

            assert.equal(
                activeTextEditor.document.getText(),
                `0123456789
abcdefghijABCDEFGHIJ`,
            );

            clearTextEditor(activeTextEditor);

            activeTextEditor.selections = [
                new Selection(new Position(0, 0), new Position(0, 0)),
            ];
            await emulator.yank();

            assert.equal(
                activeTextEditor.document.getText(),
                "\n",
            );
        });

        test("it works with multi cursor", async () => {
            activeTextEditor.selections = [
                new Selection(new Position(1, 1), new Position(1, 1)),
                new Selection(new Position(0, 1), new Position(0, 1)),
                new Selection(new Position(2, 1), new Position(2, 1)),
            ];

            await emulator.killLine();

            assert.equal(
                activeTextEditor.document.getText(),
                `0
a
A`,
            );

            clearTextEditor(activeTextEditor);

            activeTextEditor.selections = [
                new Selection(new Position(0, 0), new Position(0, 0)),
            ];
            await emulator.yank();

            assert.equal(
                activeTextEditor.document.getText(),
                `123456789
bcdefghij
BCDEFGHIJ`,
            );

        });
    });
});
