import assert from "assert";
import * as vscode from "vscode";
import { Position, Selection, TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertTextEqual, cleanUpWorkspace, setEmptyCursors, setupWorkspace, createEmulator } from "../utils";
import { Configuration } from "../../../configuration/configuration";

suite("transformToUppercase", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  const testCases = [
    {
      initialText: "aaa bbb ccc",
      expectedResults: [
        { cursorAt: new Position(0, 3), text: "AAA bbb ccc" },
        { cursorAt: new Position(0, 7), text: "AAA BBB ccc" },
        { cursorAt: new Position(0, 11), text: "AAA BBB CCC" },
      ],
    },
    {
      initialText: "aaa  bbb  ccc",
      expectedResults: [
        { cursorAt: new Position(0, 3), text: "AAA  bbb  ccc" },
        { cursorAt: new Position(0, 8), text: "AAA  BBB  ccc" },
        { cursorAt: new Position(0, 13), text: "AAA  BBB  CCC" },
      ],
    },
    {
      initialText: "aaa\nbbb\nccc",
      expectedResults: [
        { cursorAt: new Position(0, 3), text: "AAA\nbbb\nccc" },
        { cursorAt: new Position(1, 3), text: "AAA\nBBB\nccc" },
        { cursorAt: new Position(2, 3), text: "AAA\nBBB\nCCC" },
      ],
    },
    // TODO: Currently, this test case fails.
    // {
    //     initialText: "aaa \nbbb \nccc",
    //     expectedResults: [
    //         { cursorAt: new Position(0, 3), text: "AAA\nbbb\nccc"},
    //         { cursorAt: new Position(1, 3), text: "AAA\nBBB\nccc"},
    //         { cursorAt: new Position(2, 3), text: "AAA\nBBB\nCCC"},
    //     ],
    // },
  ];

  testCases.forEach(({ initialText, expectedResults }) => {
    suite(`initialText is ${initialText}`, () => {
      setup(async () => {
        activeTextEditor = await setupWorkspace(initialText);
        emulator = createEmulator(activeTextEditor);
      });

      teardown(cleanUpWorkspace);

      test("cursor moves with upcasing which enables continuous transformation when the selection is empty", async () => {
        activeTextEditor.selections = [new Selection(new Position(0, 0), new Position(0, 0))];

        for (const { cursorAt, text } of expectedResults) {
          await emulator.runCommand("transformToUppercase");
          assertTextEqual(activeTextEditor, text);
          assert.ok(activeTextEditor.selections.length === 1);
          assert.ok(activeTextEditor.selection.active.isEqual(cursorAt));
        }
      });
    });
  });
});

suite("transformToLowercase", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  const testCases = [
    {
      initialText: "AAA BBB CCC",
      expectedResults: [
        { cursorAt: new Position(0, 3), text: "aaa BBB CCC" },
        { cursorAt: new Position(0, 7), text: "aaa bbb CCC" },
        { cursorAt: new Position(0, 11), text: "aaa bbb ccc" },
      ],
    },
    {
      initialText: "AAA  BBB  CCC",
      expectedResults: [
        { cursorAt: new Position(0, 3), text: "aaa  BBB  CCC" },
        { cursorAt: new Position(0, 8), text: "aaa  bbb  CCC" },
        { cursorAt: new Position(0, 13), text: "aaa  bbb  ccc" },
      ],
    },
    {
      initialText: "AAA\nBBB\nCCC",
      expectedResults: [
        { cursorAt: new Position(0, 3), text: "aaa\nBBB\nCCC" },
        { cursorAt: new Position(1, 3), text: "aaa\nbbb\nCCC" },
        { cursorAt: new Position(2, 3), text: "aaa\nbbb\nccc" },
      ],
    },
    // TODO: Currently, this test case fails.
    // {
    //     initialText: "AAA \nBBB \nCCC",
    //     expectedResults: [
    //         { cursorAt: new Position(0, 3), text: "aaa\nBBB\nCCC"},
    //         { cursorAt: new Position(1, 3), text: "aaa\nbbb\nCCC"},
    //         { cursorAt: new Position(2, 3), text: "aaa\nbbb\nccc"},
    //     ],
    // },
  ];

  testCases.forEach(({ initialText, expectedResults }) => {
    suite(`initialText is ${initialText}`, () => {
      setup(async () => {
        activeTextEditor = await setupWorkspace(initialText);
        emulator = createEmulator(activeTextEditor);
      });

      teardown(cleanUpWorkspace);

      test("cursor moves with downcasing which enables continuous transformation when the selection is empty", async () => {
        activeTextEditor.selections = [new Selection(new Position(0, 0), new Position(0, 0))];

        for (const { cursorAt, text } of expectedResults) {
          await emulator.runCommand("transformToLowercase");
          assertTextEqual(activeTextEditor, text);
          assert.ok(activeTextEditor.selections.length === 1);
          assert.ok(activeTextEditor.selection.active.isEqual(cursorAt));
        }
      });
    });
  });
});

suite("transformToTitlecase", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  const testCases = [
    {
      initialText: "aaa bbb ccc",
      expectedResults: [
        { cursorAt: new Position(0, 3), text: "Aaa bbb ccc" },
        { cursorAt: new Position(0, 7), text: "Aaa Bbb ccc" },
        { cursorAt: new Position(0, 11), text: "Aaa Bbb Ccc" },
      ],
    },
    {
      initialText: "AAA BBB CCC",
      expectedResults: [
        { cursorAt: new Position(0, 3), text: "Aaa BBB CCC" },
        { cursorAt: new Position(0, 7), text: "Aaa Bbb CCC" },
        { cursorAt: new Position(0, 11), text: "Aaa Bbb Ccc" },
      ],
    },
    {
      initialText: "aaa  bbb  ccc",
      expectedResults: [
        { cursorAt: new Position(0, 3), text: "Aaa  bbb  ccc" },
        { cursorAt: new Position(0, 8), text: "Aaa  Bbb  ccc" },
        { cursorAt: new Position(0, 13), text: "Aaa  Bbb  Ccc" },
      ],
    },
    {
      initialText: "aaa\nbbb\nccc",
      expectedResults: [
        { cursorAt: new Position(0, 3), text: "Aaa\nbbb\nccc" },
        { cursorAt: new Position(1, 3), text: "Aaa\nBbb\nccc" },
        { cursorAt: new Position(2, 3), text: "Aaa\nBbb\nCcc" },
      ],
    },
  ];

  testCases.forEach(({ initialText, expectedResults }) => {
    suite(`initialText is ${initialText}`, () => {
      setup(async () => {
        activeTextEditor = await setupWorkspace(initialText);
        emulator = createEmulator(activeTextEditor);
      });

      teardown(cleanUpWorkspace);

      test("cursor moves with titlecase which enables continuous transformation when the selection is empty", async () => {
        activeTextEditor.selections = [new Selection(new Position(0, 0), new Position(0, 0))];

        for (const { cursorAt, text } of expectedResults) {
          await emulator.runCommand("transformToTitlecase");
          assertTextEqual(activeTextEditor, text);
          assert.ok(activeTextEditor.selections.length === 1);
          assert.ok(activeTextEditor.selection.active.isEqual(cursorAt));
        }
      });
    });
  });
});

suite("transformToLowercase (subword mode)", () => {
  const testCases = [
    {
      initialText: "AAA BBB CCC",
      expectedResults: [
        { cursorAt: new Position(0, 3), text: "aaa BBB CCC" },
        { cursorAt: new Position(0, 7), text: "aaa bbb CCC" },
        { cursorAt: new Position(0, 11), text: "aaa bbb ccc" },
      ],
    },
    {
      initialText: "abCDEf",
      expectedResults: [
        { cursorAt: new Position(0, 2), text: "abCDEf" },
        { cursorAt: new Position(0, 4), text: "abcdEf" },
        { cursorAt: new Position(0, 6), text: "abcdef" },
      ],
    },
  ];

  testCases.forEach(({ initialText, expectedResults }) => {
    suite(`initialText is ${initialText}`, () => {
      let activeTextEditor: vscode.TextEditor;
      let emulator: EmacsEmulator;
      let originalSubwordMode: boolean | undefined;
      let originalWordNavigationStyle: typeof Configuration.instance.wordNavigationStyle;

      setup(async () => {
        const emacsConfig = vscode.workspace.getConfiguration("emacs-mcx");
        originalSubwordMode = emacsConfig.get("subwordMode");
        await emacsConfig.update("subwordMode", true, vscode.ConfigurationTarget.Global);

        originalWordNavigationStyle = Configuration.instance.wordNavigationStyle;
        Configuration.instance.wordNavigationStyle = "emacs";

        activeTextEditor = await setupWorkspace(initialText);
        emulator = createEmulator(activeTextEditor);
      });
      teardown(async () => {
        const emacsConfig = vscode.workspace.getConfiguration("emacs-mcx");
        await emacsConfig.update("subwordMode", originalSubwordMode, vscode.ConfigurationTarget.Global);

        Configuration.instance.wordNavigationStyle = originalWordNavigationStyle;
        Configuration.reload();

        await cleanUpWorkspace();
      });

      test("downcasing with subword mode", async () => {
        activeTextEditor.selections = [new Selection(new Position(0, 0), new Position(0, 0))];

        for (const { cursorAt, text } of expectedResults) {
          await emulator.runCommand("transformToLowercase");
          assertTextEqual(activeTextEditor, text);
          assert.ok(activeTextEditor.selections.length === 1);
          assert.ok(activeTextEditor.selection.active.isEqual(cursorAt));
        }
      });
    });
  });
});

suite("case transformations exit mark mode", () => {
  teardown(cleanUpWorkspace);

  test("transformToUppercase exits mark mode", async () => {
    const activeTextEditor = await setupWorkspace("aaa bbb ccc");
    const emulator = createEmulator(activeTextEditor);

    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.setMarkCommand();
    await emulator.runCommand("forwardChar");

    // Verify we are in mark mode with a selection
    assert.ok(emulator.isInMarkMode);
    assert.ok(!activeTextEditor.selection.isEmpty);

    await emulator.runCommand("transformToUppercase");

    // After transformation, mark mode should be exited
    assert.ok(!emulator.isInMarkMode);
    assert.ok(activeTextEditor.selection.isEmpty);
    assertTextEqual(activeTextEditor, "aAA bbb ccc");
  });

  test("transformToLowercase exits mark mode", async () => {
    const activeTextEditor = await setupWorkspace("AAA BBB CCC");
    const emulator = createEmulator(activeTextEditor);

    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.setMarkCommand();
    await emulator.runCommand("forwardChar");

    // Verify we are in mark mode with a selection
    assert.ok(emulator.isInMarkMode);
    assert.ok(!activeTextEditor.selection.isEmpty);

    await emulator.runCommand("transformToLowercase");

    // After transformation, mark mode should be exited
    assert.ok(!emulator.isInMarkMode);
    assert.ok(activeTextEditor.selection.isEmpty);
    assertTextEqual(activeTextEditor, "Aaa BBB CCC");
  });

  test("transformToTitlecase exits mark mode", async () => {
    const activeTextEditor = await setupWorkspace("aaa bbb ccc");
    const emulator = createEmulator(activeTextEditor);

    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.setMarkCommand();
    await emulator.runCommand("forwardChar");

    // Verify we are in mark mode with a selection
    assert.ok(emulator.isInMarkMode);
    assert.ok(!activeTextEditor.selection.isEmpty);

    await emulator.runCommand("transformToTitlecase");

    // After transformation, mark mode should be exited
    assert.ok(!emulator.isInMarkMode);
    assert.ok(activeTextEditor.selection.isEmpty);
    assertTextEqual(activeTextEditor, "aAa bbb ccc");
  });
});
