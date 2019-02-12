import * as assert from "assert";
import * as vscode from "vscode";
import {Position, Range, Selection} from "vscode";
import { EmacsEmulator } from "../emulator";
import { cleanUpWorkspace, setupWorkspace} from "./utils";

suite("mark-mode", () => {
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

    const edits: Array<[string, () => Thenable<any>]> = [
        ["edit", () => activeTextEditor.edit((editBuilder) =>
            editBuilder.insert(new Position(0, 0), "hoge"))],
        ["delete", () => activeTextEditor.edit((editBuilder) =>
            editBuilder.delete(new Range(new Position(0, 0), new Position(0, 1))))],
        ["replace", () => activeTextEditor.edit((editBuilder) =>
            editBuilder.replace(new Range(new Position(0, 0), new Position(0, 1)), "hoge"))],
    ];

    edits.forEach(([label, editOp]) => {
        test(`exit mark-mode when ${label} occurs`, async () => {
            // Enter mark-mode and select some characters
            activeTextEditor.selections = [
                new Selection(new Position(0, 0), new Position(0, 0)),
            ];
            await emulator.setMarkCommand();
            await emulator.cursorMove("forwardChar");

            // Edit occurs
            await editOp();

            // assert.ok(activeTextEditor.selections.every((selection) => selection.isEmpty));

            // After edit, mark-mode is no longer active
            await emulator.cursorMove("forwardChar");
            assert.ok(activeTextEditor.selections.every((selection) => selection.isEmpty));
        });
    });
});
