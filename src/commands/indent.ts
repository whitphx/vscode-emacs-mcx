import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { EmacsCommand } from ".";

export class DeleteIndentation extends EmacsCommand {
  public readonly id = "deleteIndentation";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    await this.emacsController.runCommand("previousLine");
    await vscode.commands.executeCommand("editor.action.joinLines");
  }
}
