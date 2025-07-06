import * as vscode from "vscode";
import type { TextEditor } from "vscode";
import { EmacsCommand } from ".";
import type { IEmacsController } from "../emulator";
import { MessageManager } from "../message";
import { Minibuffer } from "src/minibuffer";
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

    let targetLine: number | undefined;
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
