import * as assert from "assert";
import { Position, Selection, TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertTextEqual, cleanUpWorkspace, setupWorkspace } from "../utils";

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
        emulator = new EmacsEmulator(activeTextEditor);
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
        emulator = new EmacsEmulator(activeTextEditor);
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
