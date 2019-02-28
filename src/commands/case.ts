// tslint:disable:max-classes-per-file
// tslint:disable:object-literal-sort-keys
import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { EmacsCommand } from ".";
import { IEmacsCommandRunner, IMarkModeController } from "../emulator";

function hasNonEmptySelection(textEditor: TextEditor): boolean {
    return textEditor.selections.some((selection) => !selection.isEmpty);
}

export class TransformToUppercase extends EmacsCommand {
    public readonly id = "transformToUppercase";

    private emacsCommandRunner: IEmacsCommandRunner;

    public constructor(
        afterExecute: () => void,
        markModeController: IMarkModeController,  // XXX: kill and yank commands have to manipulate mark-mode status
        emacsCommandRunner: IEmacsCommandRunner,
    ) {
        super(afterExecute, markModeController);

        this.emacsCommandRunner = emacsCommandRunner;
    }

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        if (!hasNonEmptySelection(textEditor)) {
            await this.emacsCommandRunner.runCommand("forwardWord");
        }
        await vscode.commands.executeCommand("editor.action.transformToUppercase");

    }
}

export class TransformToLowercase extends EmacsCommand {
    public readonly id = "transformToLowercase";

    private emacsCommandRunner: IEmacsCommandRunner;

    public constructor(
        afterExecute: () => void,
        markModeController: IMarkModeController,  // XXX: kill and yank commands have to manipulate mark-mode status
        emacsCommandRunner: IEmacsCommandRunner,
    ) {
        super(afterExecute, markModeController);

        this.emacsCommandRunner = emacsCommandRunner;
    }

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        if (!hasNonEmptySelection(textEditor)) {
            await this.emacsCommandRunner.runCommand("forwardWord");
        }
        await vscode.commands.executeCommand("editor.action.transformToLowercase");

    }
}
