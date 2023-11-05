import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { EmacsCommand } from ".";

function hasNonEmptySelection(textEditor: TextEditor): boolean {
  return textEditor.selections.some((selection) => !selection.isEmpty);
}

export class TransformToUppercase extends EmacsCommand {
  public readonly id = "transformToUppercase";

  public async run(prefixArgument: number | undefined): Promise<void> {
    if (!hasNonEmptySelection(this.emacsController.textEditor)) {
      await this.emacsController.runCommand("forwardWord");
    }
    await vscode.commands.executeCommand<void>("editor.action.transformToUppercase");
  }
}

export class TransformToLowercase extends EmacsCommand {
  public readonly id = "transformToLowercase";

  public async run(prefixArgument: number | undefined): Promise<void> {
    if (!hasNonEmptySelection(this.emacsController.textEditor)) {
      await this.emacsController.runCommand("forwardWord");
    }
    await vscode.commands.executeCommand<void>("editor.action.transformToLowercase");
  }
}

export class TransformToTitlecase extends EmacsCommand {
  public readonly id = "transformToTitlecase";

  public async run(prefixArgument: number | undefined): Promise<void> {
    if (!hasNonEmptySelection(this.emacsController.textEditor)) {
      await this.emacsController.runCommand("forwardWord");
    }
    await vscode.commands.executeCommand<void>("editor.action.transformToTitlecase");
  }
}
