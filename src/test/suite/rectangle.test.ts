import * as vscode from "vscode";
import * as expect from "expect";
import { setupWorkspace } from "./utils";
import { convertSelectionToRectSelections } from "../../rectangle";

suite("convertSelectionToRectSelections", () => {
  let document: vscode.TextDocument;

  setup(async () => {
    const initialText = "0123456789\nabcdefghij\nABCDEFGHIJ\nklmnopqrst";
    const activeTextEditor = await setupWorkspace(initialText);
    document = activeTextEditor.document;
  });

  interface TestCase {
    title: string;
    markSelection: vscode.Selection;
    expected: vscode.Selection[];
  }

  const testcases: TestCase[] = [
    {
      title: "empty selection",
      markSelection: new vscode.Selection(0, 0, 0, 0),
      expected: [new vscode.Selection(0, 0, 0, 0)],
    },
    {
      title: "single line; active is right to anchor",
      markSelection: new vscode.Selection(0, 0, 0, 9),
      expected: [new vscode.Selection(0, 0, 0, 9)],
    },
    {
      title: "single line; active is left to anchor",
      markSelection: new vscode.Selection(0, 9, 0, 0),
      expected: [new vscode.Selection(0, 9, 0, 0)],
    },
    {
      title: "multi line, same column; active is below anchor",
      markSelection: new vscode.Selection(0, 0, 2, 0),
      expected: [new vscode.Selection(0, 0, 0, 0), new vscode.Selection(1, 0, 1, 0), new vscode.Selection(2, 0, 2, 0)],
    },
    {
      title: "multi line, same column; active is above anchor",
      markSelection: new vscode.Selection(2, 0, 0, 0),
      expected: [new vscode.Selection(2, 0, 2, 0), new vscode.Selection(1, 0, 1, 0), new vscode.Selection(0, 0, 0, 0)],
    },
    {
      title: "multi line, different column; active is right bottom",
      markSelection: new vscode.Selection(0, 0, 2, 9),
      expected: [new vscode.Selection(0, 0, 0, 9), new vscode.Selection(1, 0, 1, 9), new vscode.Selection(2, 0, 2, 9)],
    },
    {
      title: "multi line, different column; active is left bottom",
      markSelection: new vscode.Selection(0, 9, 2, 0),
      expected: [new vscode.Selection(0, 9, 0, 0), new vscode.Selection(1, 9, 1, 0), new vscode.Selection(2, 9, 2, 0)],
    },
    {
      title: "multi line, different column; active is left top",
      markSelection: new vscode.Selection(2, 9, 0, 0),
      expected: [new vscode.Selection(2, 9, 2, 0), new vscode.Selection(1, 9, 1, 0), new vscode.Selection(0, 9, 0, 0)],
    },
    {
      title: "multi line, different column; active is right top",
      markSelection: new vscode.Selection(2, 0, 0, 9),
      expected: [new vscode.Selection(2, 0, 2, 9), new vscode.Selection(1, 0, 1, 9), new vscode.Selection(0, 0, 0, 9)],
    },
    {
      title: "overflow; active is right bottom",
      markSelection: new vscode.Selection(0, 0, 99, 99),
      expected: [
        new vscode.Selection(0, 0, 0, 10),
        new vscode.Selection(1, 0, 1, 10),
        new vscode.Selection(2, 0, 2, 10),
        new vscode.Selection(3, 0, 3, 10),
      ],
    },
    {
      title: "overflow; active is left bottom",
      markSelection: new vscode.Selection(0, 99, 99, 0),
      expected: [
        new vscode.Selection(0, 10, 0, 0),
        new vscode.Selection(1, 10, 1, 0),
        new vscode.Selection(2, 10, 2, 0),
        new vscode.Selection(3, 10, 3, 0),
      ],
    },
    {
      title: "overflow; active is left top",
      markSelection: new vscode.Selection(99, 99, 0, 0),
      expected: [
        new vscode.Selection(3, 10, 3, 0),
        new vscode.Selection(2, 10, 2, 0),
        new vscode.Selection(1, 10, 1, 0),
        new vscode.Selection(0, 10, 0, 0),
      ],
    },
    {
      title: "overflow; active is right top",
      markSelection: new vscode.Selection(99, 0, 0, 99),
      expected: [
        new vscode.Selection(3, 0, 3, 10),
        new vscode.Selection(2, 0, 2, 10),
        new vscode.Selection(1, 0, 1, 10),
        new vscode.Selection(0, 0, 0, 10),
      ],
    },
  ];
  testcases.forEach(({ title, markSelection, expected }) => {
    test(title, () => {
      expect(convertSelectionToRectSelections(document, markSelection)).toEqual(expected);
    });
  });
});
