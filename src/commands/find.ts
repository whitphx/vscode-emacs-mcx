import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { EmacsCommand } from ".";

export class IsearchForward extends EmacsCommand {
  public readonly id = "isearchForward";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    return vscode.commands
      .executeCommand("actions.find")
      .then(() => vscode.commands.executeCommand<void>("editor.action.nextMatchFindAction"));
  }
}

export class IsearchBackward extends EmacsCommand {
  public readonly id = "isearchBackward";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    return vscode.commands
      .executeCommand("actions.find")
      .then(() => vscode.commands.executeCommand<void>("editor.action.previousMatchFindAction"));
  }
}
