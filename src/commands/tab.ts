import * as vscode from "vscode";
import { Selection, TextEditor } from "vscode";
import { EmacsCommand } from ".";

export class TabToTabStop extends EmacsCommand {
  public readonly id = "tabToTabStop";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<unknown> {
    return vscode.commands.executeCommand("editor.action.reindentselectedlines").then(() => {
      textEditor.selections = textEditor.selections.map((selection) => {
        const indentHeadChar = textEditor.document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex;
        if (selection.active.character > indentHeadChar) {
          return selection;
        }
        const indentHeadPos = new vscode.Position(selection.active.line, indentHeadChar);
        return new Selection(indentHeadPos, indentHeadPos);
      });
    });
  }
}
