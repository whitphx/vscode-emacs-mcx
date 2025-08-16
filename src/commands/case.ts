import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { EmacsCommand, ensureCommandId } from ".";

function hasNonEmptySelection(textEditor: TextEditor): boolean {
  return textEditor.selections.some((selection) => !selection.isEmpty);
}

export class TransformToUppercase extends EmacsCommand {
  public static readonly id = ensureCommandId("transformToUppercase");

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    if (!hasNonEmptySelection(textEditor)) {
      await this.emacsController.runCommand("forwardWord");
    }
    await vscode.commands.executeCommand<void>("editor.action.transformToUppercase");
  }
}

export class TransformToLowercase extends EmacsCommand {
  public static readonly id = ensureCommandId("transformToLowercase");

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    if (!hasNonEmptySelection(textEditor)) {
      await this.emacsController.runCommand("forwardWord");
    }
    await vscode.commands.executeCommand<void>("editor.action.transformToLowercase");
  }
}

export class TransformToTitlecase extends EmacsCommand {
  public static readonly id = ensureCommandId("transformToTitlecase");

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    if (!hasNonEmptySelection(textEditor)) {
      await this.emacsController.runCommand("forwardWord");
    }
    await vscode.commands.executeCommand<void>("editor.action.transformToTitlecase");
  }
}
