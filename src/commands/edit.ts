// tslint:disable:max-classes-per-file
// tslint:disable:object-literal-sort-keys
import * as vscode from "vscode";
import { Selection, TextEditor } from "vscode";
import { createParallel, EmacsCommand } from ".";

export class DeleteBackwardChar extends EmacsCommand {
    public readonly id = "deleteBackwardChar";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const repeat = prefixArgument === undefined ? 1 : prefixArgument;
        return createParallel(repeat, () =>
            vscode.commands.executeCommand("deleteLeft"));
    }
}

export class DeleteForwardChar extends EmacsCommand {
    public readonly id = "deleteForwardChar";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const repeat = prefixArgument === undefined ? 1 : prefixArgument;
        return createParallel(repeat, () =>
            vscode.commands.executeCommand("deleteRight"));
    }
}

export class NewLine extends EmacsCommand {
    public readonly id = "newLine";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        this.markModeController.exitMarkMode();

        textEditor.selections = textEditor.selections.map((selection) =>
            new Selection(selection.active, selection.active));

        const repeat = prefixArgument === undefined ? 1 : prefixArgument;
        return createParallel(repeat, () =>
            vscode.commands.executeCommand("default:type", { text: "\n" }));
    }
}
