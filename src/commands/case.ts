// tslint:disable:max-classes-per-file
// tslint:disable:object-literal-sort-keys
import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { EmacsCommand } from ".";

function hasNonEmptySelection(textEditor: TextEditor): boolean {
    return textEditor.selections.some((selection) => !selection.isEmpty);
}

export class TransformToUppercase extends EmacsCommand {
    public readonly id = "transformToUppercase";

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        if (!hasNonEmptySelection(textEditor)) {
            await this.emacsController.runCommand("forwardWord");
        }
        await vscode.commands.executeCommand<void>("editor.action.transformToUppercase");

    }
}

export class TransformToLowercase extends EmacsCommand {
    public readonly id = "transformToLowercase";

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        if (!hasNonEmptySelection(textEditor)) {
            await this.emacsController.runCommand("forwardWord");
        }
        await vscode.commands.executeCommand<void>("editor.action.transformToLowercase");

    }
}
