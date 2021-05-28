import { TextEditor, Selection } from "vscode";

export function getNonEmptySelections(textEditor: TextEditor): Selection[] {
  return textEditor.selections.filter((selection) => !selection.isEmpty);
}

export function makeSelectionsEmpty(textEditor: TextEditor): void {
  textEditor.selections = textEditor.selections.map((selection) => new Selection(selection.active, selection.active));
}
