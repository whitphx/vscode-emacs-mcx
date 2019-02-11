import * as assert from "assert";
import { Position, Range, TextEditor } from "vscode";
import { EmacsEmulator } from "../emulator";
import { assertTextEqual, cleanUpWorkspace, setEmptyCursors, setupWorkspace } from "./utils";

suite("Prefix argument (Universal argument: C-u)", () => {
    let activeTextEditor: TextEditor;
    let emulator: EmacsEmulator;

    suite("repeating single character", () => {
        setup(async () => {
            activeTextEditor = await setupWorkspace();
            emulator = new EmacsEmulator(activeTextEditor);
        });

        teardown(cleanUpWorkspace);

        test("repeating charactor input for the given argument", async () => {
            emulator.enterPrefixArgumentMode();
            await emulator.type("2");
            await emulator.type("a");

            assertTextEqual(activeTextEditor, "aa");

            // exitied from universal argument mode
            await emulator.type("2");
            await emulator.type("b");

            assertTextEqual(activeTextEditor, "aa2b");
        });

        test("repeating charactor input for the given argument 0", async () => {
            emulator.enterPrefixArgumentMode();

            await emulator.type("0");
            await emulator.type("a");
            assertTextEqual(activeTextEditor, "");

            // exitied from universal argument mode
            await emulator.type("0");
            await emulator.type("b");
            assertTextEqual(activeTextEditor, "0b");
        });

        test("repeating charactor input for the given argument prefixed by 0", async () => {
            emulator.enterPrefixArgumentMode();
            await emulator.type("0");
            await emulator.type("2");
            await emulator.type("a");

            assertTextEqual(activeTextEditor, "aa");

            // exitied from universal argument mode
            await emulator.type("0");
            await emulator.type("2");
            await emulator.type("b");

            assertTextEqual(activeTextEditor, "aa02b");
        });

        test("repeating charactor input for the given argument with multiple digits", async () => {
            emulator.enterPrefixArgumentMode();
            await emulator.type("1");
            await emulator.type("2");
            await emulator.type("a");

            assertTextEqual(activeTextEditor, "aaaaaaaaaaaa");

            // exitied from universal argument mode
            await emulator.type("1");
            await emulator.type("2");
            await emulator.type("b");

            assertTextEqual(activeTextEditor, "aaaaaaaaaaaa12b");
        });

        test("repeating charactor input with default argument (4)", async () => {
            emulator.enterPrefixArgumentMode();
            await emulator.type("a");

            assertTextEqual(activeTextEditor, "aaaa");

            // exitied from universal argument mode
            await emulator.type("b");

            assertTextEqual(activeTextEditor, "aaaab");
        });
    });

    suite("repeating EmacsEmulator's command (cursorMove (cursorRight)) with prefix command", () => {
        setup(async () => {
            activeTextEditor = await setupWorkspace("abcdefghijklmnopqrst\nabcdefghijklmnopqrst");
            emulator = new EmacsEmulator(activeTextEditor);
        });

        teardown(cleanUpWorkspace);

        test("repeating cursorMove for the given argument", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.enterPrefixArgumentMode();
            await emulator.type("3");
            await emulator.cursorMove("cursorRight");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 3), new Position(0, 3)),
                ),
            );

            // exitied from universal argument mode
            await emulator.type("3");
            await emulator.cursorMove("cursorRight");

            assertTextEqual(activeTextEditor, "abc3defghijklmnopqrst\nabcdefghijklmnopqrst");
            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 5), new Position(0, 5)),
                ),
            );
        });

        test("repeating cursorMove for the given argument 0", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.enterPrefixArgumentMode();
            await emulator.type("0");
            await emulator.cursorMove("cursorRight");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 0), new Position(0, 0)),
                ),
            );

            // exitied from universal argument mode
            await emulator.type("0");
            await emulator.cursorMove("cursorRight");

            assertTextEqual(activeTextEditor, "0abcdefghijklmnopqrst\nabcdefghijklmnopqrst");
            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 2), new Position(0, 2)),
                ),
            );
        });

        test("repeating cursorMove for the given argument 0", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.enterPrefixArgumentMode();
            await emulator.type("0");
            await emulator.cursorMove("cursorRight");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 0), new Position(0, 0)),
                ),
            );

            // exitied from universal argument mode
            await emulator.type("0");
            await emulator.cursorMove("cursorRight");

            assertTextEqual(activeTextEditor, "0abcdefghijklmnopqrst\nabcdefghijklmnopqrst");
            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 2), new Position(0, 2)),
                ),
            );
        });

        test("repeating cursorMove for the given argument with multiple digits", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.enterPrefixArgumentMode();
            await emulator.type("1");
            await emulator.type("2");
            await emulator.cursorMove("cursorRight");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 12), new Position(0, 12)),
                ),
            );

            // exitied from universal argument mode
            await emulator.type("1");
            await emulator.type("2");
            await emulator.cursorMove("cursorRight");

            assertTextEqual(activeTextEditor, "abcdefghijkl12mnopqrst\nabcdefghijklmnopqrst");
            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 15), new Position(0, 15)),
                ),
            );
        });

        test("repeating cursorMove for the default argument (4)", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.enterPrefixArgumentMode();
            await emulator.cursorMove("cursorRight");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 4), new Position(0, 4)),
                ),
            );

            // exitied from universal argument mode
            await emulator.cursorMove("cursorRight");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 5), new Position(0, 5)),
                ),
            );
        });

        test("multicursor with given argument", async () => {
            setEmptyCursors(activeTextEditor, [0, 0], [1, 0]);

            emulator.enterPrefixArgumentMode();
            await emulator.type("3");
            await emulator.cursorMove("cursorRight");

            assert.equal(activeTextEditor.selections.length, 2);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 3), new Position(0, 3)),
                ),
            );
            assert.ok(
                activeTextEditor.selections[1].isEqual(
                    new Range(new Position(1, 3), new Position(1, 3)),
                ),
            );

            // exitied from universal argument mode
            await emulator.type("3");
            await emulator.cursorMove("cursorRight");

            assertTextEqual(activeTextEditor, "abc3defghijklmnopqrst\nabc3defghijklmnopqrst");
            assert.equal(activeTextEditor.selections.length, 2);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 5), new Position(0, 5)),
                ),
            );
            assert.ok(
                activeTextEditor.selections[1].isEqual(
                    new Range(new Position(1, 5), new Position(1, 5)),
                ),
            );
        });
    });
});
