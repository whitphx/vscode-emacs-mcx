import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { EmacsCommand, ensureCommandId } from ".";

export class AddSelectionToNextFindMatch extends EmacsCommand {
  public static readonly id = ensureCommandId("addSelectionToNextFindMatch");

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    this.emacsController.enterMarkMode(false);
    return vscode.commands.executeCommand<void>("editor.action.addSelectionToNextFindMatch");
  }
}

export class AddSelectionToPreviousFindMatch extends EmacsCommand {
  public static readonly id = ensureCommandId("addSelectionToPreviousFindMatch");

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    this.emacsController.enterMarkMode(false);
    return vscode.commands.executeCommand<void>("editor.action.addSelectionToPreviousFindMatch");
  }
}
