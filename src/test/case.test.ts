import * as assert from "assert";
import {Position, Range, Selection, TextEditor} from "vscode";
import { EmacsEmulator } from "../emulator";
import { cleanUpWorkspace, setupWorkspace, assertTextEqual} from "./utils";

suite("upcaseWord", () => {
    let activeTextEditor: TextEditor;
    let emulator: EmacsEmulator;

    setup(async () => {
        const initialText = "aaa bbb ccc";
        activeTextEditor = await setupWorkspace(initialText);
        emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("cursor moves with capitalization which enables continuous transformation", async () => {
        activeTextEditor.selections = [
            new Selection(new Position(0, 0), new Position(0, 0)),
        ];

        await emulator.transformToUppercase();
        assertTextEqual(activeTextEditor, "AAA bbb ccc");
        assert.ok(activeTextEditor.selections.length === 1);
        assert.ok(activeTextEditor.selection.isEqual(new Range(new Position(0, 3), new Position(0, 3))))

        await emulator.transformToUppercase();
        assertTextEqual(activeTextEditor, "AAA BBB ccc");
        assert.ok(activeTextEditor.selections.length === 1);
        assert.ok(activeTextEditor.selection.isEqual(new Range(new Position(0, 7), new Position(0, 7))))

        await emulator.transformToUppercase();
        assertTextEqual(activeTextEditor, "AAA BBB CCC");
        assert.ok(activeTextEditor.selections.length === 1);
        assert.ok(activeTextEditor.selection.isEqual(new Range(new Position(0, 11), new Position(0, 11))))
    });
});
