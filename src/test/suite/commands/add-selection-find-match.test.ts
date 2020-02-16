import * as assert from "assert";
import {Position, Range, Selection, TextEditor} from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { cleanUpWorkspace, setupWorkspace, tick} from "../utils";

suite("addSelectionTo(Next|Previous)FindMatch", () => {
    let activeTextEditor: TextEditor;
    let emulator: EmacsEmulator;

    setup(async () => {
        const initialText = `aaa
bbb
ccc
aaa
bbb
ccc`;
        activeTextEditor = await setupWorkspace(initialText);
        emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    ["addSelectionToNextFindMatch", "addSelectionToPreviousFindMatch"].forEach((commandName) => {
        test(`mark-mode is enabled when ${commandName} is invoked`, async () => {
            // 'aaa' appearances
            const firstRange = new Range(new Position(0, 0), new Position(0, 3));
            const secondRange = new Range(new Position(3, 0), new Position(3, 3));

            // First, select the first 'aaa'
            activeTextEditor.selections = [
                new Selection(new Position(0, 0), new Position(0, 3)),
            ];

            // execute command
            await emulator.runCommand(commandName);
            await tick();

            // Then, next 'aaa' is selected
            assert.ok(activeTextEditor.selections[0].isEqual(firstRange));
            assert.ok(activeTextEditor.selections[1].isEqual(secondRange));

            // And mark-mode is still valid
            await emulator.runCommand("backwardChar");
            await tick();

            assert.ok(activeTextEditor.selections.every((selection) => !selection.isEmpty));
        });
    });
});
