import * as vscode from "vscode";
import { Selection, TextEditor } from "vscode";
import { createParallel, EmacsCommand } from ".";

export class TabToTabStop extends EmacsCommand {
  public readonly id = "tabToTabStop";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<unknown> {
    // A single call of `editor.action.reindentselectedlines`
    // only affects a first selection which has a not indented line.
    // So we need to call it as many times as the number of selections.
    return createParallel(textEditor.selections.length, () =>
      vscode.commands.executeCommand("editor.action.reindentselectedlines"),
    ).then(() => {
      textEditor.selections = textEditor.selections.map((selection) => {
        const indentHeadChar = textEditor.document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex;
        if (selection.active.character > indentHeadChar) {
          return new Selection(selection.active, selection.active);
        }
        const indentHeadPos = new vscode.Position(selection.active.line, indentHeadChar);
        return new Selection(indentHeadPos, indentHeadPos);
      });
    });
  }
}
