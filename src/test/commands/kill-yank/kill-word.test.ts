import { TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { KillRing } from "../../../kill-ring";
import {
    assertCursorsEqual, assertTextEqual,
    cleanUpWorkspace, clearTextEditor,
    setEmptyCursors, setupWorkspace,
} from "../../utils";

suite("killWord and backwardKillWord with Lorem ipsum", () => {
    let activeTextEditor: TextEditor;
    let emulator: EmacsEmulator;

    setup(async () => {
        const initialText = "Lorem ipsum dolor sit amet,\nconsectetur adipiscing elit,";
        activeTextEditor = await setupWorkspace(initialText);
        const killRing = new KillRing(3);
        emulator = new EmacsEmulator(activeTextEditor, killRing);
    });

    teardown(cleanUpWorkspace);

    suite("killWord", () => {
        test("killing next words continuously and yank the appended words", async () => {
            setEmptyCursors(activeTextEditor, [0, 11]);  // Right to 'm' of 'ipsum'.

            // Kill twice
            await emulator.runCommand("killWord");

            assertTextEqual(activeTextEditor, "Lorem ipsum sit amet,\nconsectetur adipiscing elit,");
            assertCursorsEqual(activeTextEditor, [0, 11]);

            await emulator.runCommand("killWord");

            assertTextEqual(activeTextEditor, "Lorem ipsum amet,\nconsectetur adipiscing elit,");
            assertCursorsEqual(activeTextEditor, [0, 11]);

            // Assert the killed 2 words are appended
            await clearTextEditor(activeTextEditor);

            await emulator.runCommand("yank");

            assertTextEqual(activeTextEditor, " dolor sit");
        });

        test("working with multi-cursor", async () => {
            setEmptyCursors(activeTextEditor, [0, 11], [1, 11]);

            // Kill twice
            await emulator.runCommand("killWord");

            assertTextEqual(activeTextEditor, "Lorem ipsum sit amet,\nconsectetur elit,");
            assertCursorsEqual(activeTextEditor, [0, 11], [1, 11]);

            await emulator.runCommand("killWord");

            assertTextEqual(activeTextEditor, "Lorem ipsum amet,\nconsectetur,");
            assertCursorsEqual(activeTextEditor, [0, 11], [1, 11]);

            // Assert the killed 2 words are appended
            await clearTextEditor(activeTextEditor);

            await emulator.runCommand("yank");

            assertTextEqual(activeTextEditor, " dolor sit\n adipiscing elit");
        });

        test("handling word separator and line break", async () => {
            setEmptyCursors(activeTextEditor, [0, 21]);  // Right to 't' of 'sit'.

            await emulator.runCommand("killWord");

            assertTextEqual(activeTextEditor, "Lorem ipsum dolor sit,\nconsectetur adipiscing elit,");
            assertCursorsEqual(activeTextEditor, [0, 21]);

            await emulator.runCommand("killWord");

            // Killing comma and word-break together.
            // This behavior is different from the vscode's original deleteWordRight,
            // but same to the emacs's original one.
            assertTextEqual(activeTextEditor, "Lorem ipsum dolor sit adipiscing elit,");
            assertCursorsEqual(activeTextEditor, [0, 21]);

            // Assert the killed 2 words are appended
            await clearTextEditor(activeTextEditor);

            await emulator.runCommand("yank");

            assertTextEqual(activeTextEditor, " amet,\nconsectetur");
        });

        test("working inside a word", async () => {
            setEmptyCursors(activeTextEditor, [0, 8]);  // Between 'p' and 's' of 'ipsum'

            await emulator.runCommand("killWord");

            assertTextEqual(activeTextEditor, "Lorem ip dolor sit amet,\nconsectetur adipiscing elit,");
            assertCursorsEqual(activeTextEditor, [0, 8]);

            await emulator.runCommand("killWord");

            assertTextEqual(activeTextEditor, "Lorem ip sit amet,\nconsectetur adipiscing elit,");
            assertCursorsEqual(activeTextEditor, [0, 8]);

            // Assert the killed 2 words are appended
            await clearTextEditor(activeTextEditor);

            await emulator.runCommand("yank");

            assertTextEqual(activeTextEditor, "sum dolor");
        });

        test("working with prefix argument", async () => {
            setEmptyCursors(activeTextEditor, [0, 11]);

            // Prefix argument '4'
            await emulator.universalArgument();

            // Kill
            await emulator.runCommand("killWord");

            assertTextEqual(activeTextEditor, "Lorem ipsum adipiscing elit,");
            assertCursorsEqual(activeTextEditor, [0, 11]);

            // Check the killed words
            await clearTextEditor(activeTextEditor);

            await emulator.runCommand("yank");

            assertTextEqual(activeTextEditor, " dolor sit amet,\nconsectetur");
        });

        test("working with prefix argument with reaching the end of document and comma", async () => {
            // NOTE: comma is not considered as a word

            setEmptyCursors(activeTextEditor, [1, 11]);

            // Prefix argument '4'
            await emulator.universalArgument();

            // Kill
            await emulator.runCommand("killWord");
            assertTextEqual(activeTextEditor, "Lorem ipsum dolor sit amet,\nconsectetur");
            assertCursorsEqual(activeTextEditor, [1, 11]);

            // Check the killed words
            await clearTextEditor(activeTextEditor);

            await emulator.runCommand("yank");

            assertTextEqual(activeTextEditor, " adipiscing elit,");
        });
    });

    suite("backwardKillWord", () => {
        // "Lorem ipsum dolor sit amet,\nconsectetur adipiscing elit,"

        test("killing previous words continuously and yank the appended words", async () => {
            setEmptyCursors(activeTextEditor, [0, 21]);  // Right to 't' of 'sit'.

            // Kill twice
            await emulator.runCommand("backwardKillWord");

            assertTextEqual(activeTextEditor, "Lorem ipsum dolor  amet,\nconsectetur adipiscing elit,");
            assertCursorsEqual(activeTextEditor, [0, 18]);

            await emulator.runCommand("backwardKillWord");

            assertTextEqual(activeTextEditor, "Lorem ipsum  amet,\nconsectetur adipiscing elit,");
            assertCursorsEqual(activeTextEditor, [0, 12]);

            // Assert the killed 2 words are appended
            await clearTextEditor(activeTextEditor);

            await emulator.runCommand("yank");

            assertTextEqual(activeTextEditor, "dolor sit");
        });

        test("working with multi-cursor", async () => {
            setEmptyCursors(activeTextEditor, [0, 21], [1, 27]);  // Right to 't' of 'sit' and right to 't' of 'elit'

            // Kill twice
            await emulator.runCommand("backwardKillWord");

            assertTextEqual(activeTextEditor, "Lorem ipsum dolor  amet,\nconsectetur adipiscing ,");
            assertCursorsEqual(activeTextEditor, [0, 18], [1, 23]);

            await emulator.runCommand("backwardKillWord");

            assertTextEqual(activeTextEditor, "Lorem ipsum  amet,\nconsectetur ,");
            assertCursorsEqual(activeTextEditor, [0, 12], [1, 12]);

            // Assert the killed 2 words are appended
            await clearTextEditor(activeTextEditor);

            await emulator.runCommand("yank");

            assertTextEqual(activeTextEditor, "dolor sit\nadipiscing elit");
        });

        test("handling word separator and line break", async () => {
            setEmptyCursors(activeTextEditor, [1, 11]);  // Right to 'r' of 'nconsectetur'.

            await emulator.runCommand("backwardKillWord");

            assertTextEqual(activeTextEditor, "Lorem ipsum dolor sit amet,\n adipiscing elit,");
            assertCursorsEqual(activeTextEditor, [1, 0]);

            await emulator.runCommand("backwardKillWord");

            // Killing comma and word-break together.
            // This behavior is different from the vscode's original deleteWordLeft,
            // but same to the emacs's original one.
            assertTextEqual(activeTextEditor, "Lorem ipsum dolor sit  adipiscing elit,");
            assertCursorsEqual(activeTextEditor, [0, 22]);

            // Assert the killed 2 words are appended
            await clearTextEditor(activeTextEditor);

            await emulator.runCommand("yank");

            assertTextEqual(activeTextEditor, "amet,\nconsectetur");
        });

        test("working inside a word", async () => {
            setEmptyCursors(activeTextEditor, [0, 14]);  // Between 'o' and 'l' of 'dolor'

            await emulator.runCommand("backwardKillWord");

            assertTextEqual(activeTextEditor, "Lorem ipsum lor sit amet,\nconsectetur adipiscing elit,");
            assertCursorsEqual(activeTextEditor, [0, 12]);

            await emulator.runCommand("backwardKillWord");

            assertTextEqual(activeTextEditor, "Lorem lor sit amet,\nconsectetur adipiscing elit,");
            assertCursorsEqual(activeTextEditor, [0, 6]);

            // Assert the killed 2 words are appended
            await clearTextEditor(activeTextEditor);

            await emulator.runCommand("yank");

            assertTextEqual(activeTextEditor, "ipsum do");
        });

        test("working with prefix argument", async () => {
            setEmptyCursors(activeTextEditor, [1, 22]);

            // Prefix argument '4'
            await emulator.universalArgument();

            // Kill
            await emulator.runCommand("backwardKillWord");

            assertTextEqual(activeTextEditor, "Lorem ipsum dolor  elit,");
            assertCursorsEqual(activeTextEditor, [0, 18]);

            // Check the killed words
            await clearTextEditor(activeTextEditor);

            await emulator.runCommand("yank");

            assertTextEqual(activeTextEditor, "sit amet,\nconsectetur adipiscing");
        });

        test("working with prefix argument with reaching the beginnig of document and comma", async () => {
            setEmptyCursors(activeTextEditor, [0, 11]);

            // Prefix argument '4'
            await emulator.universalArgument();

            // Kill
            await emulator.runCommand("backwardKillWord");
            assertTextEqual(activeTextEditor, " dolor sit amet,\nconsectetur adipiscing elit,");
            assertCursorsEqual(activeTextEditor, [0, 0]);

            // Check the killed words
            await clearTextEditor(activeTextEditor);

            await emulator.runCommand("yank");

            assertTextEqual(activeTextEditor, "Lorem ipsum");
        });
    });
});
