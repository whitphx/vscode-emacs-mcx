// tslint:disable:max-classes-per-file
// tslint:disable:object-literal-sort-keys
import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { EmacsCommand } from ".";

export class AddSelectionToNextFindMatch extends EmacsCommand {
    public readonly id = "addSelectionToNextFindMatch";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        this.markModeController.enterMarkMode();
        return vscode.commands.executeCommand("editor.action.addSelectionToNextFindMatch");
    }
}

export class AddSelectionToPreviousFindMatch extends EmacsCommand {
    public readonly id = "addSelectionToPreviousFindMatch";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        this.markModeController.enterMarkMode();
        return vscode.commands.executeCommand("editor.action.addSelectionToPreviousFindMatch");
    }
}
