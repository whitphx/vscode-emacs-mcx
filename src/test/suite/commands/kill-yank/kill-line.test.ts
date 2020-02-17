import * as assert from "assert";
import * as vscode from "vscode";
import {Position, Range, Selection} from "vscode";
import { moveCommandIds } from "../../../../commands/move";
import { EmacsEmulator } from "../../../../emulator";
import { KillRing } from "../../../../kill-yank/kill-ring";
import { assertTextEqual, cleanUpWorkspace, clearTextEditor, setEmptyCursors, setupWorkspace, tick} from "../../utils";

suite("killLine", () => {
    let activeTextEditor: vscode.TextEditor;
    let emulator: EmacsEmulator;

    setup(async () => {
        const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
        activeTextEditor = await setupWorkspace(initialText);
    });

    teardown(cleanUpWorkspace);

    suite("without KillRing", () => {
        setup(() => {
            emulator = new EmacsEmulator(activeTextEditor);
        });

        test("it cuts the current line", async () => {
            setEmptyCursors(activeTextEditor, [1, 1]);  // Line_1

            await emulator.runCommand("killLine");
            await tick();

            assert.equal(
                activeTextEditor.document.getText(),
                `0123456789
a
ABCDEFGHIJ`,
            );

            await clearTextEditor(activeTextEditor);

            setEmptyCursors(activeTextEditor, [0, 0]);
            await emulator.runCommand("yank");
            await tick();

            assertTextEqual(activeTextEditor, "bcdefghij");
        });

        test("it removes line break if invoked at the end of line", async () => {
            setEmptyCursors(activeTextEditor, [1, 10]);
            await emulator.runCommand("killLine");
            await tick();

            assertTextEqual(
                activeTextEditor,
                `0123456789
abcdefghijABCDEFGHIJ`);

            await clearTextEditor(activeTextEditor);

            setEmptyCursors(activeTextEditor, [0, 0]);
            await emulator.runCommand("yank");
            await tick();

            assertTextEqual(activeTextEditor, "\n");
        });

        test("it works with multi cursor", async () => {
            setEmptyCursors(activeTextEditor, [1, 1], [0, 1], [2, 1]);

            await emulator.runCommand("killLine");
            await tick();

            assertTextEqual(
                activeTextEditor,
                `0
a
A`,
            );

            await clearTextEditor(activeTextEditor);

            setEmptyCursors(activeTextEditor, [0, 0]);
            await emulator.runCommand("yank");
            await tick();

            assertTextEqual(
                activeTextEditor,
                `123456789
bcdefghij
BCDEFGHIJ`,
            );
        });

    });

    suite("with KillRing", () => {
        setup(() => {
            const killRing = new KillRing(3);
            emulator = new EmacsEmulator(activeTextEditor, killRing);
        });

        test("it appends killed text if invoked continuously", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            await emulator.runCommand("killLine");  // 1st line
            await emulator.runCommand("killLine");  // EOL of 1st
            await emulator.runCommand("killLine");  // 2nd line
            await emulator.runCommand("killLine");  // EOL of 2nd
            await tick();

            await clearTextEditor(activeTextEditor);

            setEmptyCursors(activeTextEditor, [0, 0]);
            await emulator.runCommand("yank");
            await tick();

            assertTextEqual(
                activeTextEditor,
                `0123456789
abcdefghij
`,
            );
        });

        // Test kill appending is not enabled after cursorMove or some other commands
        const otherInterruptingCommands = [
            "selectAll",
        ];

        const interruptingCommands: string[] = [...otherInterruptingCommands];
        interruptingCommands.forEach((interruptingCommand) => {
            test(`it does not appends killed text if another command (${interruptingCommand}) invoked`, async () => {
                setEmptyCursors(activeTextEditor, [1, 5]);

                await emulator.runCommand("killLine");  // 2st line
                await emulator.runCommand("killLine");  // EOL of 2st

                await vscode.commands.executeCommand(interruptingCommand);  // Interrupt

                await emulator.runCommand("killLine");  // 3nd line
                await emulator.runCommand("killLine");  // EOL of 3nd (no effect)

                await clearTextEditor(activeTextEditor);

                setEmptyCursors(activeTextEditor, [0, 0]);
                await emulator.runCommand("yank");
                await tick();

                assert.ok(
                    !activeTextEditor.document.getText().includes("fghij\n"),  // First 2 kills does not appear here
                );
                await emulator.runCommand("yankPop");
                assert.equal(activeTextEditor.document.getText(), "fghij\n");  // First 2 kills appear here
            });
        });

        // Test kill appending is not enabled after cursorMoves, editing, or some other ops
        const moves =
            moveCommandIds.map((commandName): [string, () => (Thenable<any> | undefined)] =>
                [commandName, () => emulator.runCommand(commandName)]);
        const edits: Array<[string, () => Thenable<any>]> = [
            ["edit", () => activeTextEditor.edit((editBuilder) =>
                editBuilder.insert(new Position(0, 0), "hoge"))],
            ["delete", () => activeTextEditor.edit((editBuilder) =>
                editBuilder.delete(new Range(new Position(0, 0), new Position(0, 1))))],
            ["replace", () => activeTextEditor.edit((editBuilder) =>
                editBuilder.replace(new Range(new Position(0, 0), new Position(0, 1)), "hoge"))],
        ];
        const otherOps: Array<[string, () => Thenable<any>]> = [
            ["cancel", async () => await emulator.cancel()],
        ];

        const ops: Array<[string, () => (Thenable<any> | undefined)]> = [
            ...moves,
            ...edits,
            ...otherOps,
        ];
        ops.forEach(([label, op]) => {
            test(`it does not append the killed text after ${label}`, async () => {
                setEmptyCursors(activeTextEditor, [1, 5]);

                await emulator.runCommand("killLine");  // 2st line
                await emulator.runCommand("killLine");  // EOL of 2st

                await op();  // Interrupt

                await emulator.runCommand("killLine");  // 3nd line
                await emulator.runCommand("killLine");  // EOL of 3nd (no effect)

                await clearTextEditor(activeTextEditor);

                setEmptyCursors(activeTextEditor, [0, 0]);
                await emulator.runCommand("yank");
                await tick();

                assert.ok(
                    !activeTextEditor.document.getText().includes("fghij\n"),  // First 2 kills does not appear here
                );
                await emulator.runCommand("yankPop");
                assert.equal(activeTextEditor.document.getText(), "fghij\n");  // First 2 kills appear here
            });
        });
    });

    suite("when prefix argument specified", () => {
        setup(() => {
            emulator = new EmacsEmulator(activeTextEditor);
        });

        test("it kills multiple lines and does not leave a blank line", async () => {
            setEmptyCursors(activeTextEditor, [0, 0]);

            emulator.universalArgument();
            await emulator.type("2");

            await emulator.runCommand("killLine");
            await tick();

            assertTextEqual(activeTextEditor, `ABCDEFGHIJ`);
            assert.equal(activeTextEditor.selections.length, 1);
            assert.ok(activeTextEditor.selection.isEqual(
                new Selection(new Position(0, 0), new Position(0, 0)),
            ));

            await clearTextEditor(activeTextEditor);

            await emulator.runCommand("yank");
            await tick();
            assertTextEqual(
                activeTextEditor,
                `0123456789
abcdefghij
`);
        });
    });
});
