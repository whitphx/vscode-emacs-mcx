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
            emulator.universalArgument();
            await emulator.type("2");
            await emulator.type("a");

            assertTextEqual(activeTextEditor, "aa");

            // exitied from universal argument mode
            await emulator.type("2");
            await emulator.type("b");

            assertTextEqual(activeTextEditor, "aa2b");
        });

        test("repeating charactor input for the given argument 0", async () => {
            emulator.universalArgument();

            await emulator.type("0");
            await emulator.type("a");
            assertTextEqual(activeTextEditor, "");

            // exitied from universal argument mode
            await emulator.type("0");
            await emulator.type("b");
            assertTextEqual(activeTextEditor, "0b");
        });

        test("repeating charactor input for the given argument prefixed by 0", async () => {
            emulator.universalArgument();
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
            emulator.universalArgument();
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
            emulator.universalArgument();
            await emulator.type("a");

            assertTextEqual(activeTextEditor, "aaaa");

            // exitied from universal argument mode
            await emulator.type("b");

            assertTextEqual(activeTextEditor, "aaaab");
        });

        [2, 3].forEach((times) => {
            test(`repeating charactor input with ${times} C-u`, async () => {
                for (let i = 0; i < times; ++i) {
                    emulator.universalArgument();
                }
                await emulator.type("a");

                assertTextEqual(activeTextEditor, "a".repeat(4 ** times));

                // exitied from universal argument mode
                await emulator.type("b");

                assertTextEqual(activeTextEditor, "a".repeat(4 ** times) + "b");
            });
        });

        test("c-u stops prefix argument input", async () => {
            emulator.universalArgument();
            await emulator.type("1");
            await emulator.type("2");
            emulator.universalArgument();
            await emulator.type("3");

            assertTextEqual(activeTextEditor, "333333333333");

            // exitied from universal argument mode
            await emulator.type("4");
            await emulator.type("b");

            assertTextEqual(activeTextEditor, "3333333333334b");
        });

        test("numerical input cancels previous repeated c-u", async () => {
            emulator.universalArgument();
            emulator.universalArgument();
            emulator.universalArgument();
            await emulator.type("3");
            await emulator.type("a");

            assertTextEqual(activeTextEditor, "aaa");

            // exitied from universal argument mode
            await emulator.type("3");
            await emulator.type("b");

            assertTextEqual(activeTextEditor, "aaa3b");
        });
    });

    suite("repeating EmacsEmulator's command (cursorMove (forwardChar)) with prefix command", () => {
        setup(async () => {
            activeTextEditor = await setupWorkspace("abcdefghijklmnopqrst\nabcdefghijklmnopqrst");
            emulator = new EmacsEmulator(activeTextEditor);
        });

        teardown(cleanUpWorkspace);

        test("repeating cursorMove for the given argument", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.universalArgument();
            await emulator.type("3");
            await emulator.cursorMove("forwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 3), new Position(0, 3)),
                ),
            );

            // exitied from universal argument mode
            await emulator.type("3");
            await emulator.cursorMove("forwardChar");

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

            emulator.universalArgument();
            await emulator.type("0");
            await emulator.cursorMove("forwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 0), new Position(0, 0)),
                ),
            );

            // exitied from universal argument mode
            await emulator.type("0");
            await emulator.cursorMove("forwardChar");

            assertTextEqual(activeTextEditor, "0abcdefghijklmnopqrst\nabcdefghijklmnopqrst");
            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 2), new Position(0, 2)),
                ),
            );
        });

        test("repeating cursorMove for the given argument prefixed by 0", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.universalArgument();
            await emulator.type("0");
            await emulator.type("3");
            await emulator.cursorMove("forwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 3), new Position(0, 3)),
                ),
            );

            // exitied from universal argument mode
            await emulator.type("0");
            await emulator.type("3");
            await emulator.cursorMove("forwardChar");

            assertTextEqual(activeTextEditor, "abc03defghijklmnopqrst\nabcdefghijklmnopqrst");
            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 6), new Position(0, 6)),
                ),
            );
        });

        test("repeating cursorMove for the given argument with multiple digits", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.universalArgument();
            await emulator.type("1");
            await emulator.type("2");
            await emulator.cursorMove("forwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 12), new Position(0, 12)),
                ),
            );

            // exitied from universal argument mode
            await emulator.type("1");
            await emulator.type("2");
            await emulator.cursorMove("forwardChar");

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

            emulator.universalArgument();
            await emulator.cursorMove("forwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 4), new Position(0, 4)),
                ),
            );

            // exitied from universal argument mode
            await emulator.cursorMove("forwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 5), new Position(0, 5)),
                ),
            );
        });

        test("repeating charactor input with 2 C-u", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.universalArgument();
            emulator.universalArgument();
            await emulator.cursorMove("forwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 16), new Position(0, 16)),
                ),
            );

            // exitied from universal argument mode
            await emulator.cursorMove("forwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 17), new Position(0, 17)),
                ),
            );
        });

        test("c-u stops prefix argument input", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.universalArgument();
            await emulator.type("1");
            await emulator.type("2");
            emulator.universalArgument();
            await emulator.cursorMove("forwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 12), new Position(0, 12)),
                ),
            );

            // exitied from universal argument mode
            await emulator.cursorMove("forwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 13), new Position(0, 13)),
                ),
            );
        });

        test("numerical input cancels previous repeated c-u", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.universalArgument();
            emulator.universalArgument();
            emulator.universalArgument();
            await emulator.type("3");
            await emulator.cursorMove("forwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 3), new Position(0, 3)),
                ),
            );

            // exitied from universal argument mode
            await emulator.cursorMove("forwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selections[0].isEqual(
                    new Range(new Position(0, 4), new Position(0, 4)),
                ),
            );
        });

        test("multicursor with given argument", async () => {
            setEmptyCursors(activeTextEditor, [0, 0], [1, 0]);

            emulator.universalArgument();
            await emulator.type("3");
            await emulator.cursorMove("forwardChar");

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
            await emulator.cursorMove("forwardChar");

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

    suite.only("with forwardChar in multi-line text", () => {
        setup(async () => {
            activeTextEditor = await setupWorkspace("aaa\n".repeat(8));
            emulator = new EmacsEmulator(activeTextEditor);
        });

        teardown(cleanUpWorkspace);

        test("cursor moves over lines", () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.universalArgument();
            emulator.universalArgument();  // C-u * 2 makes 16 character movements

            emulator.cursorMove("forwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selection.isEqual(
                    new Range(new Position(4, 0), new Position(4, 0)),
                ),
            );
        });

        test("cursor moves at most to the end of the text", () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.universalArgument();
            emulator.universalArgument();
            emulator.universalArgument();  // C-u * 3 makes 64 character movements

            emulator.cursorMove("forwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selection.isEqual(
                    new Range(new Position(8, 0), new Position(8, 0)),
                ),
            );
        });
    });

    suite("with backwardChar in multi-line text", () => {
        setup(async () => {
            activeTextEditor = await setupWorkspace("aaa\n".repeat(8));
            emulator = new EmacsEmulator(activeTextEditor);
        });

        teardown(cleanUpWorkspace);

        test("cursor moves over lines", () => {
            setEmptyCursors(activeTextEditor, [8, 0]);

            emulator.universalArgument();
            emulator.universalArgument();  // C-u * 2 makes 16 character movements

            emulator.cursorMove("backwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selection.isEqual(
                    new Range(new Position(4, 0), new Position(4, 0)),
                ),
            );
        });

        test("cursor moves at most to the beginning of the text", () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.universalArgument();
            emulator.universalArgument();
            emulator.universalArgument();  // C-u * 3 makes 64 character movements

            emulator.cursorMove("backwardChar");

            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(
                activeTextEditor.selection.isEqual(
                    new Range(new Position(0, 0), new Position(0, 0)),
                ),
            );
        });
    });
});
