import * as vscode from "vscode";
import { Selection } from "vscode";
import { makeParallel, EmacsCommand } from ".";

export class TabToTabStop extends EmacsCommand {
  public readonly id = "tabToTabStop";

  public run(prefixArgument: number | undefined): Thenable<unknown> {
    // A single call of `editor.action.reindentselectedlines`
    // only affects a first selection which has a not indented line.
    // So we need to call it as many times as the number of selections.
    return makeParallel(this.emacsController.textEditor.selections.length, () =>
      vscode.commands.executeCommand("editor.action.reindentselectedlines"),
    ).then(() => {
      this.emacsController.textEditor.selections = this.emacsController.textEditor.selections.map((selection) => {
        const indentHeadChar = this.emacsController.textEditor.document.lineAt(
          selection.active.line,
        ).firstNonWhitespaceCharacterIndex;
        if (selection.active.character > indentHeadChar) {
          return new Selection(selection.active, selection.active);
        }
        const indentHeadPos = new vscode.Position(selection.active.line, indentHeadChar);
        return new Selection(indentHeadPos, indentHeadPos);
      });
    });
  }
}
