import { Range, TextEditor } from "vscode";

export function revealPrimaryActive(textEditor: TextEditor): void {
  return textEditor.revealRange(new Range(textEditor.selection.active, textEditor.selection.active));
}
