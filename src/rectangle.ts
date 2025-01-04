import * as vscode from "vscode";
import { getEolChar } from "./commands/helpers/eol";
import { getNonEmptySelections, makeSelectionsEmpty } from "./commands/helpers/selection";
import { revealPrimaryActive } from "./commands/helpers/reveal";
import { IEmacsController } from "./emulator";
import { deleteRanges } from "./utils";

export function convertSelectionToRectSelections(
  document: vscode.TextDocument,
  selection: vscode.Selection,
): vscode.Selection[] {
  const rectSelections: vscode.Selection[] = [];
  const anchorLine = Math.max(0, Math.min(selection.anchor.line, document.lineCount - 1));
  const activeLine = Math.max(0, Math.min(selection.active.line, document.lineCount - 1));

  // Get character positions and ensure they respect Unicode boundaries
  const getCharacterPosition = (line: number, char: number): number => {
    const lineText = document.lineAt(line).text;
    // Find the nearest valid character boundary
    let pos = char;
    while (pos > 0 && !isValidCharacterBoundary(lineText, pos)) {
      pos--;
    }
    return pos;
  };

  const isValidCharacterBoundary = (text: string, pos: number): boolean => {
    // Check if we're at a valid Unicode character boundary
    if (pos === 0 || pos === text.length) return true;

    // Get the character at current position and previous position
    const char = text.charAt(pos);
    const prevChar = text.charAt(pos - 1);

    // Check for surrogate pairs and combining marks
    if (isSurrogatePair(prevChar, char) || isCombiningMark(char)) {
      return false;
    }

    // Handle full-width characters (CJK)
    const isFullWidth = (c: string): boolean => {
      const code = c.charCodeAt(0);
      return (
        (code >= 0x3000 && code <= 0x9fff) || // CJK Unified Ideographs
        (code >= 0xff00 && code <= 0xffef) || // Halfwidth and Fullwidth Forms
        (code >= 0x20000 && code <= 0x2a6df) || // CJK Unified Ideographs Extension B
        (code >= 0x2a700 && code <= 0x2b73f) || // CJK Unified Ideographs Extension C
        (code >= 0x2b740 && code <= 0x2b81f) // CJK Unified Ideographs Extension D
      );
    };

    // Check if we're in the middle of a full-width character
    if (isFullWidth(prevChar) || isFullWidth(char)) {
      return true; // Allow boundaries between full-width characters
    }

    // Handle emoji sequences
    const isEmoji = (c: string): boolean => {
      const code = c.charCodeAt(0);
      return code >= 0x1f300 && code <= 0x1f9ff; // Emoji ranges
    };

    // Allow boundaries between emoji
    if (isEmoji(prevChar) || isEmoji(char)) {
      return true;
    }

    return true; // Default to allowing the boundary
  };

  const isSurrogatePair = (high: string, low: string): boolean => {
    return (
      high.charCodeAt(0) >= 0xd800 &&
      high.charCodeAt(0) <= 0xdbff &&
      low.charCodeAt(0) >= 0xdc00 &&
      low.charCodeAt(0) <= 0xdfff
    );
  };

  const isCombiningMark = (char: string): boolean => {
    const code = char.charCodeAt(0);
    return (
      (code >= 0x0300 && code <= 0x036f) || // Combining Diacritical Marks
      (code >= 0x1ab0 && code <= 0x1aff) || // Combining Diacritical Marks Extended
      (code >= 0x1dc0 && code <= 0x1dff) || // Combining Diacritical Marks Supplement
      (code >= 0x20d0 && code <= 0x20ff)
    ); // Combining Diacritical Marks for Symbols
  };

  const anchorChar = getCharacterPosition(anchorLine, selection.anchor.character);
  const activeChar = getCharacterPosition(activeLine, selection.active.character);

  // Determine visual selection order
  const fromLine = Math.min(anchorLine, activeLine);
  const toLine = Math.max(anchorLine, activeLine);

  // Create array of lines in the correct order
  const lines = Array.from({ length: toLine - fromLine + 1 }, (_, i) => fromLine + i);

  // Determine selection directions
  const isBottomToTop = activeLine < anchorLine;
  const isRightToLeft = activeChar < anchorChar;

  // Process lines in the original order
  for (const line of lines) {
    const maxChar = document.lineAt(line).range.end.character;
    const lineText = document.lineAt(line).text;

    // Get initial positions based on original selection
    const anchorPos = Math.min(Math.max(anchorChar, 0), maxChar);
    const activePos = Math.min(Math.max(activeChar, 0), maxChar);

    // Find valid character boundaries for both positions
    let adjustedAnchor = anchorPos;
    let adjustedActive = activePos;

    // Adjust anchor position to valid character boundary based on selection direction
    if (isRightToLeft) {
      // For right-to-left selection, expand anchor to the left
      while (adjustedAnchor > 0 && !isValidCharacterBoundary(lineText, adjustedAnchor)) {
        adjustedAnchor--;
      }
    } else {
      // For left-to-right selection, expand anchor to the right
      while (adjustedAnchor < maxChar && !isValidCharacterBoundary(lineText, adjustedAnchor)) {
        adjustedAnchor++;
      }
    }

    // Adjust active position to valid character boundary based on selection direction
    if (isRightToLeft) {
      // For right-to-left selection, expand active to the right
      while (adjustedActive < maxChar && !isValidCharacterBoundary(lineText, adjustedActive)) {
        adjustedActive++;
      }
    } else {
      // For left-to-right selection, expand active to the left
      while (adjustedActive > 0 && !isValidCharacterBoundary(lineText, adjustedActive)) {
        adjustedActive--;
      }
    }

    // Create selection maintaining original direction
    const selection = new vscode.Selection(line, adjustedAnchor, line, adjustedActive);

    // Add selection to result array, respecting vertical direction
    if (isBottomToTop) {
      rectSelections.unshift(selection);
    } else {
      rectSelections.push(selection);
    }
  }

  return rectSelections;
}

export function getRectText(document: vscode.TextDocument, range: vscode.Range): string {
  const rectRanges = convertSelectionToRectSelections(document, new vscode.Selection(range.start, range.end));
  return rectRanges.map((rectRange) => document.getText(rectRange)).join(getEolChar(document.eol));
}

export type RectangleTexts = string[];

interface CopyOrDeleteRectOptions {
  copy: boolean;
  delete: boolean;
}
export async function copyOrDeleteRect(
  emacsController: IEmacsController,
  textEditor: vscode.TextEditor,
  options: CopyOrDeleteRectOptions,
): Promise<RectangleTexts | null> {
  const selections = getNonEmptySelections(textEditor);

  if (selections.length !== 1) {
    // Multiple cursors not supported
    return null;
  }
  const selection = selections[0]!;

  const notReversedSelection = new vscode.Selection(selection.start, selection.end);

  const rectSelections = convertSelectionToRectSelections(textEditor.document, notReversedSelection);

  // Copy
  let copiedRectText: RectangleTexts | null = null;
  if (options.copy) {
    const rectText = rectSelections.map((lineSelection) => textEditor.document.getText(lineSelection));

    copiedRectText = rectText;
  }

  // Delete
  if (options.delete) {
    await deleteRanges(textEditor, rectSelections);
    revealPrimaryActive(textEditor);
  }

  emacsController.exitMarkMode();
  makeSelectionsEmpty(textEditor);

  return copiedRectText;
}

export async function insertRect(textEditor: vscode.TextEditor, rectTexts: RectangleTexts): Promise<void> {
  if (rectTexts.length === 0) {
    return;
  }

  const rectHeight = rectTexts.length - 1;
  const rectWidth = rectTexts[rectHeight]!.length;

  const active = textEditor.selection.active; // Multi-cursor is not supported
  await textEditor.edit((edit) => {
    const maxLine = textEditor.document.lineCount - 1;

    const insertColumn = active.character;

    const eolChar = getEolChar(textEditor.document.eol);

    let rectLine = 0;
    while (rectLine <= rectHeight) {
      const insertLine = active.line + rectLine;
      if (insertLine > maxLine) {
        break;
      }

      const additionalColumns = Math.max(0, insertColumn - textEditor.document.lineAt(insertLine).range.end.character);

      const insertText = " ".repeat(additionalColumns) + rectTexts[rectLine];
      edit.insert(new vscode.Position(insertLine, insertColumn), insertText);

      ++rectLine;
    }

    if (rectLine <= rectHeight) {
      const additionalText = rectTexts
        .slice(rectLine)
        .map((lineText) => eolChar + " ".repeat(insertColumn) + lineText)
        .join("");
      const lastPoint = textEditor.document.lineAt(maxLine).range.end;
      edit.insert(lastPoint, additionalText);
    }
  });

  const newActive = active.translate(rectHeight, rectWidth);
  textEditor.selection = new vscode.Selection(newActive, newActive);
}
