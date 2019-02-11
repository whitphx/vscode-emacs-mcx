import { TextEditor } from "vscode";
import { EmacsEmulator } from "../emulator";
import { assertTextEqual, cleanUpWorkspace, setupWorkspace } from "./utils";

suite("Universal argument", () => {
    let activeTextEditor: TextEditor;
    let emulator: EmacsEmulator;

    setup(async () => {
        activeTextEditor = await setupWorkspace();
        emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("repeating charactor input for the given argument", async () => {
        emulator.enterUniversalArgumentMode();
        await emulator.type("2");
        await emulator.type("a");

        assertTextEqual(activeTextEditor, "aa");

        // exitied from universal argument mode
        await emulator.type("2");
        await emulator.type("b");

        assertTextEqual(activeTextEditor, "aa2b");
    });

    test("repeating charactor input for the given argument 0", async () => {
        emulator.enterUniversalArgumentMode();

        await emulator.type("0");
        await emulator.type("a");
        assertTextEqual(activeTextEditor, "");

        // exitied from universal argument mode
        await emulator.type("0");
        await emulator.type("b");
        assertTextEqual(activeTextEditor, "0b");
    });

    test("repeating charactor input for the given argument prefixed by 0", async () => {
        emulator.enterUniversalArgumentMode();
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
        emulator.enterUniversalArgumentMode();
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
        emulator.enterUniversalArgumentMode();
        await emulator.type("a");

        assertTextEqual(activeTextEditor, "aaaa");

        // exitied from universal argument mode
        await emulator.type("b");

        assertTextEqual(activeTextEditor, "aaaab");
    });
});
