import * as vscode from "vscode";
import { EmacsCommand } from ".";

export class AddSelectionToNextFindMatch extends EmacsCommand {
  public readonly id = "addSelectionToNextFindMatch";

  public execute(prefixArgument: number | undefined): Thenable<void> {
    this.emacsController.enterMarkMode(false);
    return vscode.commands.executeCommand<void>("editor.action.addSelectionToNextFindMatch");
  }
}

export class AddSelectionToPreviousFindMatch extends EmacsCommand {
  public readonly id = "addSelectionToPreviousFindMatch";

  public execute(prefixArgument: number | undefined): Thenable<void> {
    this.emacsController.enterMarkMode(false);
    return vscode.commands.executeCommand<void>("editor.action.addSelectionToPreviousFindMatch");
  }
}
