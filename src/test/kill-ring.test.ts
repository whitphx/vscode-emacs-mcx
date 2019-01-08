import * as clipboardy from "clipboardy";
import * as vscode from "vscode";
import {Position, Selection} from "vscode";
import { EmacsEmulator } from "../emulator";
import { KillRing } from "../kill-ring";
import { assertTextEqual, cleanUpWorkspace, clearTextEditor, setupWorkspace} from "./utils";

suite("killRing", () => {
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
            emulator.killRegion();

            await clearTextEditor(
                activeTextEditor,
                "dolor sit amet,\nconsectetur adipiscing elit,");
            await vscode.commands.executeCommand("editor.action.selectAll");
            emulator.killRegion();

            await clearTextEditor(
                activeTextEditor,
                "sed do eiusmod tempor\nincididunt ut labore et\ndolore magna aliqua.");
            await vscode.commands.executeCommand("editor.action.selectAll");
            emulator.killRegion();

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
            await emulator.yank();
            assertTextEqual(
                activeTextEditor, `0123456789
abcdesed do eiusmod tempor\nincididunt ut labore et\ndolore magna aliqua.fghij
ABCDEFGHIJ`);

            await emulator.yankPop();
            assertTextEqual(
                activeTextEditor, `0123456789
abcdedolor sit amet,\nconsectetur adipiscing elit,fghij
ABCDEFGHIJ`);

            await emulator.yankPop();
            assertTextEqual(
                activeTextEditor, `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`);

            // Repeat
            await emulator.yankPop();
            assertTextEqual(
                activeTextEditor, `0123456789
abcdesed do eiusmod tempor\nincididunt ut labore et\ndolore magna aliqua.fghij
ABCDEFGHIJ`);

            await emulator.yankPop();
            assertTextEqual(
                activeTextEditor, `0123456789
abcdedolor sit amet,\nconsectetur adipiscing elit,fghij
ABCDEFGHIJ`);

            await emulator.yankPop();
            assertTextEqual(
                activeTextEditor, `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`);

            // Repeat again
            await emulator.yankPop();
            assertTextEqual(
                activeTextEditor, `0123456789
abcdesed do eiusmod tempor\nincididunt ut labore et\ndolore magna aliqua.fghij
ABCDEFGHIJ`);

            await emulator.yankPop();
            assertTextEqual(
                activeTextEditor, `0123456789
abcdedolor sit amet,\nconsectetur adipiscing elit,fghij
ABCDEFGHIJ`);

            await emulator.yankPop();
            assertTextEqual(
                activeTextEditor, `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`);
        });

        test("works with clipboard", () => {
            // TODO
        });

        test("shares killRing amoung multiple editors", () => {
            // TODO
        });
    });
});
