import * as vscode from "vscode";

export function convertSelectionToRectSelections(
  document: vscode.TextDocument,
  selection: vscode.Selection
): vscode.Selection[] {
  const lineDelta = selection.active.line > selection.anchor.line ? 1 : -1;

  const rectSelections: vscode.Selection[] = [];
  for (let line = selection.anchor.line; line !== selection.active.line + lineDelta; line += lineDelta) {
    const maxChar = document.lineAt(line).range.end.character;
    rectSelections.push(
      new vscode.Selection(
        new vscode.Position(line, Math.min(selection.anchor.character, maxChar)),
        new vscode.Position(line, Math.min(selection.active.character, maxChar))
      )
    );
  }

  return rectSelections;
}
