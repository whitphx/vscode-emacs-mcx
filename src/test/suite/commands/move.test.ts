import * as assert from "assert";
import { Range, TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertCursorsEqual, setEmptyCursors, setupWorkspace, cleanUpWorkspace, tick } from "../utils";

suite("scroll-up/down-command", () => {
    let activeTextEditor: TextEditor;
    let emulator: EmacsEmulator;
    let visibleRange: Range;
    let pageLines: number;

    setup(async () => {
        const initialText = "a\n".repeat(100);
        activeTextEditor =  await setupWorkspace(initialText);
        emulator = new EmacsEmulator(activeTextEditor);

        visibleRange = activeTextEditor.visibleRanges[0];
        pageLines = visibleRange.end.line - visibleRange.start.line;
    });

    teardown(cleanUpWorkspace);

    suite("scroll-up-command", () => {
        test("it scrolls one page", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);  // The first line

            await emulator.runCommand("scrollUpCommand");
            await tick();

            assert.ok(activeTextEditor.selection.start.line >= pageLines - 1);
        });

        test("it scrolls with the speficied number of lines by the prefix argument", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);  // The first line

            emulator.universalArgument();
            await emulator.type("2");
            await emulator.runCommand("scrollUpCommand");
            await tick();

            assertCursorsEqual(activeTextEditor, [2, 0]);  // 2 lines down
        });
    });

    suite("scroll-down-command", () => {
        test("it scrolls one page", async () => {
            const startLine = pageLines * 2;
            setEmptyCursors(activeTextEditor, [startLine, 0]);

            await emulator.runCommand("scrollDownCommand");
            await tick();

            assert.ok(activeTextEditor.selection.start.line <= startLine - pageLines + 1);
        });

        test("it scrolls with the speficied number of lines by the prefix argument", async () => {
            setEmptyCursors(activeTextEditor, [10, 0]);

            emulator.universalArgument();
            await emulator.type("2");
            await emulator.runCommand("scrollDownCommand");
            await tick();

            assertCursorsEqual(activeTextEditor, [8, 0]);  // 2 lines up
        });
    });
});
