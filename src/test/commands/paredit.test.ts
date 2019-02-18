import * as assert from "assert";
import { Position, Range, TextEditor } from "vscode";
import { EmacsEmulator } from "../../emulator";
import { setEmptyCursors, setupWorkspace } from "../utils";

suite("paredit commands", () => {
    let activeTextEditor: TextEditor;
    let emulator: EmacsEmulator;

    setup(async () => {
        const initialText = "(a b)";

        activeTextEditor = await setupWorkspace(initialText);
        emulator = new EmacsEmulator(activeTextEditor);
    });

    suite("forwardSexp", () => {
        test("without mark-mode", () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.runCommand("paredit.forwardSexp");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(activeTextEditor.selections[0].isEqual(
                new Range(new Position(0, 5), new Position(0, 5))));
        });

        test("with mark-mode", () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.setMarkCommand();
            emulator.runCommand("paredit.forwardSexp");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(activeTextEditor.selections[0].isEqual(
                new Range(new Position(0, 0), new Position(0, 5))));
        });
    });

    suite("backwardSexp", () => {
        test("without mark-mode", () => {
            setEmptyCursors(activeTextEditor, [0, 5]);

            emulator.runCommand("paredit.backwardSexp");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(activeTextEditor.selections[0].isEqual(
                new Range(new Position(0, 0), new Position(0, 0))));
        });

        test("with mark-mode", () => {
            setEmptyCursors(activeTextEditor, [0, 5]);

            emulator.setMarkCommand();
            emulator.runCommand("paredit.backwardSexp");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(activeTextEditor.selections[0].isEqual(
                new Range(new Position(0, 5), new Position(0, 0))));
        });
    });
});
