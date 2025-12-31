/* eslint-disable @typescript-eslint/require-await */
import assert from "assert";
import * as vscode from "vscode";
import { findNextWordEnd, findPreviousWordStart } from "../../commands/helpers/wordOperations";
import { WordCharacterClassifier } from "../../vs/editor/common/controller/wordCharacterClassifier";
import { Position } from "vscode";

// Starting from (0, 0), call findNextWordEnd repeatedly and
// return the list of positions.
function listAllNextWordEndPositions(doc: vscode.TextDocument, classfier: WordCharacterClassifier): Position[] {
  const found: Position[] = [];
  let position = new Position(0, 0);
  while (true) {
    const newPosition = findNextWordEnd(doc, classfier, position, true);
    if (!newPosition.isAfter(position)) {
      break;
    }
    found.push(newPosition);
    position = newPosition;
  }
  return found;
}

// Starting from the end of the document, call findPreviousWordStart
// repeatedly and return the list of positions.
function listAllPreviousWordStartPositions(doc: vscode.TextDocument, classfier: WordCharacterClassifier): Position[] {
  const found: Position[] = [];
  let position = new Position(doc.lineCount - 1, doc.lineAt(doc.lineCount - 1).text.length);
  console.log(`PREV: start pos=${JSON.stringify(position)}`);
  while (true) {
    const newPosition = findPreviousWordStart(doc, classfier, position, true);
    if (!newPosition.isBefore(position)) {
      break;
    }
    found.push(newPosition);
    position = newPosition;
  }
  return found;
}

suite("findNextWordEnd", () => {
  let doc: vscode.TextDocument;
  setup(async () => {
    doc = await vscode.workspace.openTextDocument({
      content: "abcDeFGk := aBc\na C",
      language: "text",
    });
  });

  test("forward whole word", async () => {
    const classifier = new WordCharacterClassifier(":=", false);
    assert.deepStrictEqual(listAllNextWordEndPositions(doc, classifier), [
      new Position(0, 8),
      new Position(0, 11),
      new Position(0, 15),
      new Position(1, 1),
      new Position(1, 3),
    ]);
  });
  test("forward subword", async () => {
    const classifier = new WordCharacterClassifier("", true);
    assert.deepStrictEqual(listAllNextWordEndPositions(doc, classifier), [
      new Position(0, 3),
      new Position(0, 5),
      new Position(0, 6),
      new Position(0, 8),
      new Position(0, 13),
      new Position(0, 15),
      new Position(1, 1),
      new Position(1, 3),
    ]);
  });
});

suite("findPreviousWordStart", () => {
  let doc: vscode.TextDocument;
  setup(async () => {
    doc = await vscode.workspace.openTextDocument({
      content: "abcDeFGk := aBc\na C",
      language: "text",
    });
  });

  test("backward whole word", async () => {
    const classifier = new WordCharacterClassifier(":=", false);
    assert.deepStrictEqual(listAllPreviousWordStartPositions(doc, classifier), [
      new Position(1, 2),
      new Position(1, 0),
      new Position(0, 12),
      new Position(0, 9),
      new Position(0, 0),
    ]);
  });
  test("backward subword", async () => {
    const classifier = new WordCharacterClassifier("", true);
    assert.deepStrictEqual(listAllPreviousWordStartPositions(doc, classifier), [
      new Position(1, 2),
      new Position(1, 0),
      new Position(0, 12),
      new Position(0, 6),
      new Position(0, 5),
      new Position(0, 3),
      new Position(0, 0),
    ]);
  });
});
