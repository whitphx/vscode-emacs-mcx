import * as vscode from "vscode";
import * as assert from "assert";
import { EmacsEmulator } from "../../emulator";
import { findCharForward } from "../../commands/zap";
import {
  assertTextEqual,
  cleanUpWorkspace,
  assertCursorsEqual,
  setupWorkspace,
  setEmptyCursors,
  createEmulator,
} from "./utils";

suite("findCharForward", () => {
  const testSuites: {
    name: string;
    text: string;
    testCases: {
      start: vscode.Position;
      char: string;
      repeat: number;
      expected: vscode.Position | undefined;
      description?: string;
    }[];
  }[] = [
    /* cSpell:disable */
    {
      name: "single byte characters",
      text: "abcdefg\nhijklmn\nopqrstu\nvwxyz",
      testCases: [
        {
          start: new vscode.Position(0, 0),
          char: "c",
          repeat: 1,
          expected: new vscode.Position(0, 2),
          description: "stopChar after cursor",
        },
        {
          start: new vscode.Position(0, 0),
          char: "a",
          repeat: 1,
          expected: new vscode.Position(0, 0),
          description: "stopChar at cursor",
        },
        {
          start: new vscode.Position(0, 0),
          char: "n",
          repeat: 1,
          expected: new vscode.Position(1, 6),
          description: "stopChar in next line",
        },
        {
          start: new vscode.Position(0, 0),
          char: "o",
          repeat: 1,
          expected: new vscode.Position(2, 0),
          description: "stopChar in 2 lines after",
        },
        { start: new vscode.Position(2, 7), char: "a", repeat: 1, expected: undefined },
      ],
    },
    {
      name: "including spaces and punctuation",
      text: "a b,c.d!e?f\ng h\ti\njkl;mn:op",
      testCases: [
        { start: new vscode.Position(0, 0), char: ",", repeat: 1, expected: new vscode.Position(0, 3) },
        { start: new vscode.Position(0, 0), char: " ", repeat: 1, expected: new vscode.Position(0, 1) },
        { start: new vscode.Position(0, 0), char: "!", repeat: 1, expected: new vscode.Position(0, 7) },
        { start: new vscode.Position(0, 0), char: "\t", repeat: 1, expected: new vscode.Position(1, 3) },
        { start: new vscode.Position(0, 0), char: ";", repeat: 1, expected: new vscode.Position(2, 3) },
      ],
    },
    {
      name: "empty lines",
      text: "abc\n\ndef\n\nghi",
      testCases: [
        { start: new vscode.Position(0, 0), char: "d", repeat: 1, expected: new vscode.Position(2, 0) },
        { start: new vscode.Position(0, 2), char: "e", repeat: 1, expected: new vscode.Position(2, 1) },
        { start: new vscode.Position(1, 0), char: "g", repeat: 1, expected: new vscode.Position(4, 0) },
        { start: new vscode.Position(3, 0), char: "x", repeat: 1, expected: undefined },
      ],
    },
    {
      name: "repeated search",
      text: "abcabcabc\nabcabc\nabc",
      testCases: [
        { start: new vscode.Position(0, 0), char: "a", repeat: 2, expected: new vscode.Position(0, 3) },
        { start: new vscode.Position(0, 0), char: "a", repeat: 3, expected: new vscode.Position(0, 6) },
        { start: new vscode.Position(0, 0), char: "a", repeat: 4, expected: new vscode.Position(1, 0) },
        { start: new vscode.Position(0, 0), char: "a", repeat: 5, expected: new vscode.Position(1, 3) },
        { start: new vscode.Position(0, 0), char: "a", repeat: 6, expected: new vscode.Position(2, 0) },
        { start: new vscode.Position(0, 0), char: "a", repeat: 7, expected: undefined },
        { start: new vscode.Position(2, 0), char: "a", repeat: -1, expected: new vscode.Position(1, 3) },
        { start: new vscode.Position(2, 0), char: "a", repeat: -2, expected: new vscode.Position(1, 0) },
      ],
    },
    {
      name: "multi byte characters",
      text: "あいうえお\nかきくけこ\nあいうえお\nかきくけこ",
      testCases: [
        { start: new vscode.Position(0, 0), char: "う", repeat: 1, expected: new vscode.Position(0, 2) },
        { start: new vscode.Position(0, 0), char: "あ", repeat: 1, expected: new vscode.Position(0, 0) },
        { start: new vscode.Position(0, 1), char: "あ", repeat: 1, expected: new vscode.Position(2, 0) },
        { start: new vscode.Position(1, 0), char: "け", repeat: 1, expected: new vscode.Position(1, 3) },
        { start: new vscode.Position(1, 4), char: "あ", repeat: 1, expected: new vscode.Position(2, 0) },
        { start: new vscode.Position(2, 4), char: "お", repeat: 1, expected: new vscode.Position(2, 4) },
        { start: new vscode.Position(2, 5), char: "あ", repeat: 1, expected: undefined },
      ],
    },
    {
      name: "Unicode surrogate pairs",
      text: "😀😃😄😁😆\n😅😂🤣😊😇\n😀😃😄😁😆\n😅😂🤣😊😇",
      testCases: [
        { start: new vscode.Position(0, 0), char: "😀", repeat: 1, expected: new vscode.Position(0, 0) },
        { start: new vscode.Position(0, 0), char: "😄", repeat: 1, expected: new vscode.Position(0, 4) }, // Note: VS Code positions use UTF-16 code units, so each emoji (surrogate pair) occupies 2 character positions.
        { start: new vscode.Position(0, 2), char: "😀", repeat: 1, expected: new vscode.Position(2, 0) },
        { start: new vscode.Position(2, 0), char: "😀", repeat: -1, expected: new vscode.Position(0, 0) },
      ],
    },
    /* cSpell:enable */
  ];

  testSuites.forEach(({ name, text, testCases }) => {
    suite(`${name} (text=${JSON.stringify(text)})`, () => {
      let doc: vscode.TextDocument;

      setup(async () => {
        doc = await vscode.workspace.openTextDocument({
          content: text,
          language: "text",
        });
      });

      teardown(cleanUpWorkspace);

      testCases.forEach(({ start, char, repeat, expected, description }) => {
        test(`start=${start.line},${start.character}; char='${char}'; repeat=${repeat} ${description ? `(${description})` : ""}`, () => {
          const result = findCharForward(doc, start, char, repeat);
          assert.deepStrictEqual(result, expected);
        });
      });
    });
  });
});

suite("ZapCommands", () => {
  const initialText = "abcd\nabcdef\n";

  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText, { language: "javascript" });
    activeTextEditor.options.tabSize = 2;
    emulator = createEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("delete first character", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("zapCharCommand", "a");
    assertTextEqual(activeTextEditor, "bcd\nabcdef\n");
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });

  test("zaps across lines to target in next line", async () => {
    setEmptyCursors(activeTextEditor, [0, 3]);
    await emulator.runCommand("zapCharCommand", "c");
    assertTextEqual(activeTextEditor, "abcdef\n");
    assertCursorsEqual(activeTextEditor, [0, 3]);
  });

  test("delete middle character in first line", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("zapCharCommand", "c");
    assertTextEqual(activeTextEditor, "d\nabcdef\n");
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });

  test("does nothing when target character does not exist", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);
    await emulator.runCommand("zapCharCommand", "z");
    assertTextEqual(activeTextEditor, "abcd\nabcdef\n");
    assertCursorsEqual(activeTextEditor, [0, 0]);
  });

  test("stopchar before the cursor", async () => {
    setEmptyCursors(activeTextEditor, [0, 1]);
    await emulator.runCommand("zapCharCommand", "a");
    assertTextEqual(activeTextEditor, "abcdef\n");
    assertCursorsEqual(activeTextEditor, [0, 1]);
  });

  test("delete char in second line", async () => {
    setEmptyCursors(activeTextEditor, [1, 0]);
    await emulator.runCommand("zapCharCommand", "b");
    assertTextEqual(activeTextEditor, "abcd\ncdef\n");
    assertCursorsEqual(activeTextEditor, [1, 0]);
  });

  test("includes stopChar when at cursor position", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]);
    await emulator.runCommand("zapCharCommand", "c");
    assertTextEqual(activeTextEditor, "abd\nabcdef\n");
    assertCursorsEqual(activeTextEditor, [0, 2]);
  });
});
