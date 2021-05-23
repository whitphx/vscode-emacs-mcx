import * as vscode from "vscode";

export function convertSelectionToRectSelections(
  document: vscode.TextDocument,
  selection: vscode.Selection
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
        Math.min(selection.active.character, maxChar)
      )
    );
  }

  if (selection.active.line < selection.anchor.line) {
    rectSelections.reverse();
  }

  return rectSelections;
}
