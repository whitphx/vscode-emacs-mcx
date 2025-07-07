import * as vscode from "vscode";
import type { TextEditor } from "vscode";
import { EmacsCommand } from ".";
import type { IEmacsController } from "../emulator";
import { MessageManager } from "../message";
import { Minibuffer } from "../minibuffer";
import { revealPrimaryActive } from "./helpers/reveal";

export class GotoLine extends EmacsCommand {
  public readonly id = "gotoLine";

  private minibuffer: Minibuffer;

  constructor(markModeController: IEmacsController, minibuffer: Minibuffer) {
    super(markModeController);
    this.minibuffer = minibuffer;
  }

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const anchors = textEditor.selections.map((selection) => selection.anchor);

    // By default, ask the user to input a line number.
    // If the prefix argument is given, use its value as the target line.
    let targetLine: number | undefined = prefixArgument;
    let validationMessage: string | undefined;
    while (targetLine == null || isNaN(targetLine)) {
      const targetLineStr = await this.minibuffer.readFromMinibuffer({ prompt: "Goto Line", validationMessage });
      if (targetLineStr == null) {
        // User cancelled the input
        return;
      }
      targetLine = parseInt(targetLineStr, 10);
      if (isNaN(targetLine)) {
        validationMessage = "Please enter a number.";
      }
    }

    const clampedTargetLine = Math.max(1, Math.min(targetLine, textEditor.document.lineCount));

    // This command intentionally abort the multi-cursor mode.
    // Jumping to a line keeping the multi-cursor mode is confusing.
    const active = new vscode.Position(clampedTargetLine - 1, 0);
    textEditor.selection = new vscode.Selection(isInMarkMode ? textEditor.selection.anchor : active, active);

    revealPrimaryActive(textEditor);

    if (!isInMarkMode) {
      this.emacsController.pushMark(anchors);
      MessageManager.showMessage("Mark set");
    }
  }
}

export class FindDefinitions extends EmacsCommand {
  public readonly id = "findDefinitions";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const anchors = textEditor.selections.map((selection) => selection.anchor);

    await vscode.commands.executeCommand("editor.action.revealDefinition");

    if (isInMarkMode) {
      // The selections should have been updated by the `revealDefinition` command,
      // so we reconcile them with the anchors, i.e. marks.
      // The code below deals with multiple selections,
      // however, in real, the `revealDefinition` command removes non-primary selections.
      textEditor.selections = textEditor.selections.map((selection, index) => {
        const anchor = anchors[index];
        if (anchor == null) {
          return selection;
        }
        return new vscode.Selection(anchor, selection.active);
      });
    } else {
      this.emacsController.pushMark(anchors);
      // Original Emacs' `xref-find-definitions` command does not show the "Mark set" message,
    }
  }
}
