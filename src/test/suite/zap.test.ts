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
    testCases: { start: vscode.Position; char: string; expected: vscode.Position | undefined; description?: string }[];
  }[] = [
    {
      name: "single byte characters",
      text: "abcdefg\nhijklmn\nopqrstu\nvwxyz",
      testCases: [
        {
          start: new vscode.Position(0, 0),
          char: "c",
          expected: new vscode.Position(0, 2),
          description: "stopChar after cursor",
        },
        {
          start: new vscode.Position(0, 0),
          char: "a",
          expected: new vscode.Position(0, 0),
          description: "stopChar at cursor",
        },
        {
          start: new vscode.Position(0, 0),
          char: "n",
          expected: new vscode.Position(1, 6),
          description: "stopChar in next line",
        },
        {
          start: new vscode.Position(0, 0),
          char: "o",
          expected: new vscode.Position(2, 0),
          description: "stopChar in 2 lines after",
        },
        { start: new vscode.Position(2, 7), char: "a", expected: undefined },
      ],
    },
    {
      name: "multi byte characters",
      text: "あいうえお\nかきくけこ\nあいうえお\nかきくけこ",
      testCases: [
        { start: new vscode.Position(0, 0), char: "う", expected: new vscode.Position(0, 2) },
        { start: new vscode.Position(0, 0), char: "あ", expected: new vscode.Position(0, 0) },
        { start: new vscode.Position(0, 1), char: "あ", expected: new vscode.Position(2, 0) },
        { start: new vscode.Position(1, 0), char: "け", expected: new vscode.Position(1, 3) },
        { start: new vscode.Position(1, 4), char: "あ", expected: new vscode.Position(2, 0) },
        { start: new vscode.Position(2, 4), char: "お", expected: new vscode.Position(2, 4) },
        { start: new vscode.Position(2, 5), char: "あ", expected: undefined },
      ],
    },
    {
      name: "Unicode surrogate pairs",
      text: "😀😃😄😁😆\n😅😂🤣😊😇\n😀😃😄😁😆\n😅😂🤣😊😇",
      testCases: [
        { start: new vscode.Position(0, 0), char: "😀", expected: new vscode.Position(0, 0) },
        { start: new vscode.Position(0, 0), char: "😄", expected: new vscode.Position(0, 4) }, // Position.char doesn't take care of surrogate pairs and it counts UTF-16 chars as 2.
        { start: new vscode.Position(0, 2), char: "😀", expected: new vscode.Position(2, 0) },
      ],
    },
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

      testCases.forEach(({ start, char, expected, description }) => {
        test(`start=${start.line},${start.character}; char='${char}' ${description ? `(${description})` : ""}`, () => {
          const result = findCharForward(doc, start, char);
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
