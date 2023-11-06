import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { EmacsCommand } from ".";

export class DeleteIndentation extends EmacsCommand {
  public readonly id = "deleteIndentation";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<unknown> {
    return vscode.commands
      .executeCommand("emacs-mcx.previousLine")
      .then(() => vscode.commands.executeCommand("editor.action.joinLines"));
  }
}
