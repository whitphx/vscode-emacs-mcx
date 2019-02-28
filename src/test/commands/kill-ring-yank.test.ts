import * as assert from "assert";
import * as clipboardy from "clipboardy";
import * as vscode from "vscode";
import {Position, Range, Selection} from "vscode";
import { moveCommandIds } from "../../commands/move";
import { EmacsEmulator } from "../../emulator";
import { KillRing } from "../../kill-ring";
import { assertTextEqual, cleanUpWorkspace, clearTextEditor, setupWorkspace} from "../utils";

suite("kill, yank, yank-pop", () => {
    let activeTextEditor: vscode.TextEditor;

    suite("with empty initial text", () => {
        setup(async () => {
            activeTextEditor = await setupWorkspace();
            await clipboardy.write("");
        });

        teardown(cleanUpWorkspace);

        test("it holds the past kills and takes them for yank", async () => {
            const killRing = new KillRing(3);
            const emulator = new EmacsEmulator(activeTextEditor, killRing);

            // kill 3 times with different texts
            await clearTextEditor(
                activeTextEditor,
                "Lorem ipsum");
            await vscode.commands.executeCommand("editor.action.selectAll");
            emulator.runCommand("killRegion");

            await clearTextEditor(
                activeTextEditor,
                "dolor sit amet,\nconsectetur adipiscing elit,");
            await vscode.commands.executeCommand("editor.action.selectAll");
            emulator.runCommand("killRegion");

            await clearTextEditor(
                activeTextEditor,
                "sed do eiusmod tempor\nincididunt ut labore et\ndolore magna aliqua.");
            await vscode.commands.executeCommand("editor.action.selectAll");
            emulator.runCommand("killRegion");

            // Initialize with non-empty text
            const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
            await clearTextEditor(activeTextEditor, initialText);

            // Set cursor at the middle of the text
            activeTextEditor.selection = new Selection(
                new Position(1, 5),
                new Position(1, 5),
            );

            // yank + yankPop
            await emulator.runCommand("yank");
            assertTextEqual(
                activeTextEditor, `0123456789
abcdesed do eiusmod tempor\nincididunt ut labore et\ndolore magna aliqua.fghij
ABCDEFGHIJ`);

            await emulator.runCommand("yankPop");
            assertTextEqual(
                activeTextEditor, `0123456789
abcdedolor sit amet,\nconsectetur adipiscing elit,fghij
ABCDEFGHIJ`);

            await emulator.runCommand("yankPop");
            assertTextEqual(
                activeTextEditor, `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`);

            // Repeat
            await emulator.runCommand("yankPop");
            assertTextEqual(
                activeTextEditor, `0123456789
abcdesed do eiusmod tempor\nincididunt ut labore et\ndolore magna aliqua.fghij
ABCDEFGHIJ`);

            await emulator.runCommand("yankPop");
            assertTextEqual(
                activeTextEditor, `0123456789
abcdedolor sit amet,\nconsectetur adipiscing elit,fghij
ABCDEFGHIJ`);

            await emulator.runCommand("yankPop");
            assertTextEqual(
                activeTextEditor, `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`);

            // Repeat again
            await emulator.runCommand("yankPop");
            assertTextEqual(
                activeTextEditor, `0123456789
abcdesed do eiusmod tempor\nincididunt ut labore et\ndolore magna aliqua.fghij
ABCDEFGHIJ`);

            await emulator.runCommand("yankPop");
            assertTextEqual(
                activeTextEditor, `0123456789
abcdedolor sit amet,\nconsectetur adipiscing elit,fghij
ABCDEFGHIJ`);

            await emulator.runCommand("yankPop");
            assertTextEqual(
                activeTextEditor, `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`);
        });

        test("works with clipboard", async () => {
            const killRing = new KillRing(3);
            const emulator = new EmacsEmulator(activeTextEditor, killRing);

            // Kill first
            await clearTextEditor(
                activeTextEditor,
                "Lorem ipsum");
            await vscode.commands.executeCommand("editor.action.selectAll");
            emulator.runCommand("killRegion");

            // Then, copy to clipboard
            clipboardy.writeSync("12345");

            // Initialize with non-empty text
            const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
            await clearTextEditor(activeTextEditor, initialText);

            // Set cursor at the middle of the text
            activeTextEditor.selection = new Selection(
                new Position(1, 5),
                new Position(1, 5),
            );

            // yank firstly takes the text on clipboard
            await emulator.runCommand("yank");
            assertTextEqual(
                activeTextEditor, `0123456789
abcde12345fghij
ABCDEFGHIJ`);

            // Then, yankPop takes from killRing
            await emulator.runCommand("yankPop");
            assertTextEqual(
                activeTextEditor, `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`);

            // Repeat
            await emulator.runCommand("yankPop");
            assertTextEqual(
                activeTextEditor, `0123456789
abcde12345fghij
ABCDEFGHIJ`);

            await emulator.runCommand("yankPop");
            assertTextEqual(
                activeTextEditor, `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`);

            // Repeat again
            await emulator.runCommand("yankPop");
            assertTextEqual(
                activeTextEditor, `0123456789
abcde12345fghij
ABCDEFGHIJ`);

            await emulator.runCommand("yankPop");
            assertTextEqual(
                activeTextEditor, `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`);

        });

        // Test yankPop is not executed after cursorMove or some other commands
        const otherInterruptingCommands = [
            "selectAll",
        ];
        const interruptingCommands: string[] = [...otherInterruptingCommands];

        interruptingCommands.forEach((interruptingCommand) => {
            test(`yankPop does not work if ${interruptingCommand} is executed after previous yank`, async () => {
                const killRing = new KillRing(3);
                const emulator = new EmacsEmulator(activeTextEditor, killRing);

                // Kill texts
                await clearTextEditor(
                    activeTextEditor,
                    "FOO");
                await vscode.commands.executeCommand("editor.action.selectAll");
                emulator.runCommand("killRegion");

                await clearTextEditor(
                    activeTextEditor,
                    "BAR");
                await vscode.commands.executeCommand("editor.action.selectAll");
                emulator.runCommand("killRegion");

                // Initialize with non-empty text
                const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
                await clearTextEditor(activeTextEditor, initialText);

                // Set cursor at the middle of the text
                activeTextEditor.selection = new Selection(
                    new Position(1, 5),
                    new Position(1, 5),
                );

                // yank first
                await emulator.runCommand("yank");
                assertTextEqual(
                    activeTextEditor, `0123456789
abcdeBARfghij
ABCDEFGHIJ`);

                // Interruption command invoked
                await vscode.commands.executeCommand(interruptingCommand);

                // yankPop does not work
                await emulator.runCommand("yankPop");
                assertTextEqual(
                    activeTextEditor, `0123456789
abcdeBARfghij
ABCDEFGHIJ`);
            });

            test(`yankPop does not work if ${interruptingCommand} is executed after previous yankPop`, async () => {
                const killRing = new KillRing(3);
                const emulator = new EmacsEmulator(activeTextEditor, killRing);

                // Kill texts
                await clearTextEditor(
                    activeTextEditor,
                    "FOO");
                await vscode.commands.executeCommand("editor.action.selectAll");
                emulator.runCommand("killRegion");

                await clearTextEditor(
                    activeTextEditor,
                    "BAR");
                await vscode.commands.executeCommand("editor.action.selectAll");
                emulator.runCommand("killRegion");

                // Initialize with non-empty text
                const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
                await clearTextEditor(activeTextEditor, initialText);

                // Set cursor at the middle of the text
                activeTextEditor.selection = new Selection(
                    new Position(1, 5),
                    new Position(1, 5),
                );

                // yank first
                await emulator.runCommand("yank");
                assertTextEqual(
                    activeTextEditor, `0123456789
abcdeBARfghij
ABCDEFGHIJ`);

                // Then, yankPop
                await emulator.runCommand("yankPop");
                assertTextEqual(
                    activeTextEditor, `0123456789
abcdeFOOfghij
ABCDEFGHIJ`);

                // Interruption command invoked
                await vscode.commands.executeCommand(interruptingCommand);

                // yankPop does not work
                await emulator.runCommand("yankPop");
                assertTextEqual(
                    activeTextEditor, `0123456789
abcdeFOOfghij
ABCDEFGHIJ`);
            });

        });

        suite("yankPop is not executed after editing or cursorMove commands", () => {
            let emulator: EmacsEmulator;

            const edits: Array<[string, () => Thenable<any>]> = [
                ["edit", () => activeTextEditor.edit((editBuilder) =>
                    editBuilder.insert(new Position(0, 0), "hoge"))],
                ["delete", () => activeTextEditor.edit((editBuilder) =>
                    editBuilder.delete(new Range(new Position(0, 0), new Position(0, 1))))],
                ["replace", () => activeTextEditor.edit((editBuilder) =>
                    editBuilder.replace(new Range(new Position(0, 0), new Position(0, 1)), "hoge"))],
            ];

            const moves =
                moveCommandIds.map((commandName): [string, () => (Thenable<any> | undefined)] =>
                    [commandName, () => emulator.runCommand(commandName)]);

            setup(() => {
                const killRing = new KillRing(3);
                emulator = new EmacsEmulator(activeTextEditor, killRing);
            });

            [...edits, ...moves].forEach(([label, interruptOp]) => {
                test(`yankPop does not work if ${label} is executed after previous yank`, async () => {
                    // Kill texts
                    await clearTextEditor(
                        activeTextEditor,
                        "FOO");
                    await vscode.commands.executeCommand("editor.action.selectAll");
                    emulator.runCommand("killRegion");

                    await clearTextEditor(
                        activeTextEditor,
                        "BAR");
                    await vscode.commands.executeCommand("editor.action.selectAll");
                    emulator.runCommand("killRegion");

                    // Initialize with non-empty text
                    const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
                    await clearTextEditor(activeTextEditor, initialText);

                    // Set cursor at the middle of the text
                    activeTextEditor.selection = new Selection(
                        new Position(1, 5),
                        new Position(1, 5),
                    );

                    // yank first
                    await emulator.runCommand("yank");
                    assertTextEqual(
                        activeTextEditor, `0123456789
abcdeBARfghij
ABCDEFGHIJ`);

                    // Interruption command invoked
                    await interruptOp();

                    // yankPop does not work
                    await emulator.runCommand("yankPop");
                    assert.ok(activeTextEditor.document.getText().includes("BAR"));
                    assert.ok(!activeTextEditor.document.getText().includes("FOO"));
                });

                test(`yankPop does not work if ${label} is executed after previous yankPop`, async () => {
                    // Kill texts
                    await clearTextEditor(
                        activeTextEditor,
                        "FOO");
                    await vscode.commands.executeCommand("editor.action.selectAll");
                    emulator.runCommand("killRegion");

                    await clearTextEditor(
                        activeTextEditor,
                        "BAR");
                    await vscode.commands.executeCommand("editor.action.selectAll");
                    emulator.runCommand("killRegion");

                    // Initialize with non-empty text
                    const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
                    await clearTextEditor(activeTextEditor, initialText);

                    // Set cursor at the middle of the text
                    activeTextEditor.selection = new Selection(
                        new Position(1, 5),
                        new Position(1, 5),
                    );

                    // yank first
                    await emulator.runCommand("yank");
                    assertTextEqual(
                        activeTextEditor, `0123456789
abcdeBARfghij
ABCDEFGHIJ`);

                    // Then, yankPop
                    await emulator.runCommand("yankPop");
                    assertTextEqual(
                        activeTextEditor, `0123456789
abcdeFOOfghij
ABCDEFGHIJ`);

                    // Interruption command invoked
                    await interruptOp();

                    // yankPop does not work
                    // yankPop does not work
                    await emulator.runCommand("yankPop");
                    assert.ok(activeTextEditor.document.getText().includes("FOO"));
                    assert.ok(!activeTextEditor.document.getText().includes("BAR"));
                });

            });
        });
    });
});

suite("With not only single text editor", () => {
    setup(async () => {
        await clipboardy.write("");
    });

    test("shares killRing amoung multiple editors", async () => {
        const killRing = new KillRing(3);

        const activeTextEditor0 = await setupWorkspace();
        const emulator0 = new EmacsEmulator(activeTextEditor0, killRing);

        // Kill texts from one text editor
        await clearTextEditor(
            activeTextEditor0,
            "FOO");
        await vscode.commands.executeCommand("editor.action.selectAll");
        emulator0.runCommand("killRegion");

        await clearTextEditor(
            activeTextEditor0,
            "BAR");
        await vscode.commands.executeCommand("editor.action.selectAll");
        emulator0.runCommand("killRegion");

        const activeTextEditor1 = await setupWorkspace("");
        const emulator1 = new EmacsEmulator(activeTextEditor1, killRing);

        // The killed texts are yanked on another text editor
        await emulator1.runCommand("yank");
        assertTextEqual(
            activeTextEditor1, "BAR");

        await emulator1.runCommand("yankPop");
        assertTextEqual(
            activeTextEditor1, "FOO");

        // Repeat
        await emulator1.runCommand("yankPop");
        assertTextEqual(
            activeTextEditor1, "BAR");

        await emulator1.runCommand("yankPop");
        assertTextEqual(
            activeTextEditor1, "FOO");
    });
});
