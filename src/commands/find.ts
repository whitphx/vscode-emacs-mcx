import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { EmacsCommand } from ".";

export class Find extends EmacsCommand {
  public readonly id = "find";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const nextMatchFindActionFunc = () => vscode.commands.executeCommand<void>("editor.action.nextMatchFindAction");
    return vscode.commands.executeCommand("actions.find").then(nextMatchFindActionFunc);
  }
}
