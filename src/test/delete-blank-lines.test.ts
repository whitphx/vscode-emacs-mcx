import * as assert from "assert";
import * as vscode from "vscode";
import { EmacsEmulator } from "../emulator";
import { assertTextEqual, cleanUpWorkspace, clearTextEditor, setupWorkspace, setEmptyCursors} from "./utils";

suite.only("deleteBlankLines", () => {
    let activeTextEditor: vscode.TextEditor;
    let emulator: EmacsEmulator;

    setup(async () => {
        // 5 blank lines at 2 locations
        const initialText = `0123456789





abcdefghij





ABCDEFGHIJ`;
        activeTextEditor = await setupWorkspace(initialText);
        emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    const cursorPositionsLinst: Array<Array<[number, number]>> = [
        [[1, 0], [7, 0]],  // At the beginning of each blanks
        [[3, 0], [9, 0]],  // At the middle of each blanks
        [[5, 0], [11, 0]],  // At the end of each blanks
    ];
    cursorPositionsLinst.forEach((cursorPositions) => {
        test("removing all but 1 lines around the cursor with multi cursor", async () => {
            setEmptyCursors(activeTextEditor, ...cursorPositions);

            await emulator.deleteBlankLines();

            const expected = `0123456789

abcdefghij

ABCDEFGHIJ`;

            assertTextEqual(activeTextEditor, expected);
        });
    });
});
