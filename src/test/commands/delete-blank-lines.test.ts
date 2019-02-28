import * as vscode from "vscode";
import { EmacsEmulator } from "../../emulator";
import { assertTextEqual, cleanUpWorkspace, setEmptyCursors, setupWorkspace} from "../utils";

suite("deleteBlankLines", () => {
    let activeTextEditor: vscode.TextEditor;
    let emulator: EmacsEmulator;

    // 5 blank lines at 2 locations
    const initialText = `aaa    bbb





xxx    yyy





123    456`;

    setup(async () => {
        activeTextEditor = await setupWorkspace(initialText);
        emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    suite("cursors are in the blanks", () => {
        const cursorPositionsLinst: Array<Array<[number, number]>> = [
            [[1, 0], [7, 0]],  // At the beginning of each blanks
            [[3, 0], [9, 0]],  // At the middle of each blanks
            [[5, 0], [11, 0]],  // At the end of each blanks
        ];
        cursorPositionsLinst.forEach((cursorPositions) => {
            test("removing all but 1 lines around the cursor", async () => {
                setEmptyCursors(activeTextEditor, ...cursorPositions);

                await emulator.runCommand("deleteBlankLines");

                const expected = `aaa    bbb

xxx    yyy

123    456`;
                assertTextEqual(activeTextEditor, expected);
            });
        });
    });

    suite("cursors are at the beginning or the middle of non-empty lines", () => {
        const cursorPositionsLinst: Array<Array<[number, number]>> = [
            [[0, 0], [0, 0]],  // At the beginning of the first non-empty line
            [[0, 5], [0, 5]],  // At the middle of the first non-empty line
            [[6, 0], [6, 0]],  // At the beginning of the second non-empty line
            [[6, 5], [6, 5]],  // At the middle of the second non-empty line
            [[12, 0], [12, 0]],  // At the beginning of the last non-empty line
            [[12, 5], [12, 5]],  // At the middle of the last non-empty line
        ];
        cursorPositionsLinst.forEach((cursorPositions) => {
            test("nothing happens", async () => {
                setEmptyCursors(activeTextEditor, ...cursorPositions);

                await emulator.runCommand("deleteBlankLines");

                assertTextEqual(activeTextEditor, initialText);
            });
        });
    });

    suite("cursors are at the end of non-empty lines", () => {
        const cursorPositionsLinst: Array<Array<[number, number]>> = [
            [[0, 10], [6, 10]],
        ];
        cursorPositionsLinst.forEach((cursorPositions) => {
            test("removing all following lines", async () => {
                setEmptyCursors(activeTextEditor, ...cursorPositions);

                await emulator.runCommand("deleteBlankLines");

                const expected = `aaa    bbb
xxx    yyy
123    456`;
                assertTextEqual(activeTextEditor, expected);
            });
        });
    });
});
