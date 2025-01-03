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
  const lineStart = Math.max(selection.start.line, 0);
  const lineEnd = Math.min(selection.end.line, document.lineCount - 1);
  for (let line = lineStart; line <= lineEnd; line++) {
    const maxChar = document.lineAt(line).range.end.character;
    rectSelections.push(
      new vscode.Selection(
        line,
        Math.min(selection.anchor.character, maxChar),
        line,
        Math.min(selection.active.character, maxChar),
      ),
    );
  }

  if (selection.active.line < selection.anchor.line) {
    rectSelections.reverse();
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
