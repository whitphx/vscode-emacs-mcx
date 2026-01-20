/* eslint-disable @typescript-eslint/require-await */
import assert from "assert";
import * as vscode from "vscode";
import { findNextWordEnd, findPreviousWordStart } from "../../commands/helpers/wordOperations";
import { WordCharacterClassifier } from "../../vs/editor/common/controller/wordCharacterClassifier";
import { Position } from "vscode";

// Starting from (0, 0), call findNextWordEnd repeatedly and
// return the list of positions.
function listAllNextWordEndPositions(
  doc: vscode.TextDocument,
  classifier: WordCharacterClassifier,
  subwordMode: boolean,
): Position[] {
  const found: Position[] = [];
  let position = new Position(0, 0);
  while (true) {
    const newPosition = findNextWordEnd(doc, classifier, position, true, subwordMode);
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
function listAllPreviousWordStartPositions(
  doc: vscode.TextDocument,
  classifier: WordCharacterClassifier,
  subwordMode: boolean,
): Position[] {
  const found: Position[] = [];
  let position = new Position(doc.lineCount - 1, doc.lineAt(doc.lineCount - 1).text.length);
  while (true) {
    const newPosition = findPreviousWordStart(doc, classifier, position, true, subwordMode);
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
    const classifier = new WordCharacterClassifier(":=");
    assert.deepStrictEqual(listAllNextWordEndPositions(doc, classifier, false), [
      new Position(0, 8),
      new Position(0, 11),
      new Position(0, 15),
      new Position(1, 1),
      new Position(1, 3),
    ]);
  });
  test("forward subword", async () => {
    const classifier = new WordCharacterClassifier("");
    assert.deepStrictEqual(listAllNextWordEndPositions(doc, classifier, true), [
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
    const classifier = new WordCharacterClassifier(":=");
    assert.deepStrictEqual(listAllPreviousWordStartPositions(doc, classifier, false), [
      new Position(1, 2),
      new Position(1, 0),
      new Position(0, 12),
      new Position(0, 9),
      new Position(0, 0),
    ]);
  });
  test("backward subword", async () => {
    const classifier = new WordCharacterClassifier("");
    assert.deepStrictEqual(listAllPreviousWordStartPositions(doc, classifier, true), [
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
