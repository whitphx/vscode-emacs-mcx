import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { EmacsCommand, IEmacsCommandInterrupted } from ".";
import { IEmacsCommandRunner, IMarkModeController } from "../emulator";
import { getNonEmptySelections, makeSelectionsEmpty } from "./helpers/selection";
import { convertSelectionToRectSelections } from "../rectangle";
import { revealPrimaryActive } from "./helpers/reveal";

/**
 * This command is assigned to `C-x r` and sets `emacs-mcx.acceptingRectCommand` context
 * to simulate the original keybindings like `C-x r k` as VSCode does not natively support
 * such continuous key sequences without modifiers.
 * In the example above, `kill-rectangle` command is assigned to a single `k` key
 * with `{ "when": "emacs-mcx.acceptingRectCommand" }` condition.
 * Then, `kill-rectangle` can be executed through `C-x r k`.
 */
export class StartAcceptingRectCommand extends EmacsCommand implements IEmacsCommandInterrupted {
  public readonly id = "startAcceptingRectCommand";

  private acceptingRectCommand = false;

  public startAcceptingRectCommand(): void {
    this.acceptingRectCommand = true;
    vscode.commands.executeCommand("setContext", "emacs-mcx.acceptingRectCommand", true);
  }

  private stopAcceptingRectCommand(): void {
    this.acceptingRectCommand = false;
    vscode.commands.executeCommand("setContext", "emacs-mcx.acceptingRectCommand", false);
  }

  public execute(): void {
    this.startAcceptingRectCommand();
  }

  public onDidInterruptTextEditor(): void {
    if (this.acceptingRectCommand) {
      this.stopAcceptingRectCommand();
    }
  }
}

type KilledRectangle = string[];
export interface RectangleState {
  latestKilledRectangle: KilledRectangle; // multi-cursor is not supported
}

export abstract class RectangleKillYankCommand extends EmacsCommand {
  protected rectangleState: RectangleState;

  public constructor(
    afterExecute: () => void,
    emacsController: IMarkModeController & IEmacsCommandRunner,
    rectangleState: RectangleState
  ) {
    super(afterExecute, emacsController);

    this.rectangleState = rectangleState;
  }
}

async function deleteRanges(textEditor: vscode.TextEditor, ranges: vscode.Range[], maxTrials = 3): Promise<boolean> {
  let success = false;
  let trial = 0;
  while (!success && trial < maxTrials) {
    success = await textEditor.edit((editBuilder) => {
      ranges.forEach((range) => {
        editBuilder.delete(range);
      });
    });
    trial++;
  }

  return success;
}

abstract class EditRectangle extends RectangleKillYankCommand {
  protected copy = false;
  protected delete = false;

  public async execute(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined
  ): Promise<void> {
    const selections = getNonEmptySelections(textEditor);
    if (selections.length === 0) {
      return;
    }

    const selection = selections[0]; // multi-cursor is not supported
    const notReversedSelection = new vscode.Selection(selection.start, selection.end);

    const rectSelections = convertSelectionToRectSelections(textEditor.document, notReversedSelection);

    // Copy
    if (this.copy) {
      const rectText = rectSelections.map((lineSelection) => textEditor.document.getText(lineSelection));

      this.rectangleState.latestKilledRectangle = rectText;
    }

    // Delete
    if (this.delete) {
      await deleteRanges(textEditor, rectSelections).then();

      revealPrimaryActive(textEditor);

      this.emacsController.exitMarkMode();
      makeSelectionsEmpty(textEditor);
    }
  }
}

export class DeleteRectangle extends EditRectangle {
  public readonly id = "deleteRectangle";
  protected delete = true;
  protected copy = false;
}

export class CopyRectangleAsKill extends EditRectangle {
  public readonly id = "copyRectangleAsKill";
  protected delete = false;
  protected copy = true;
}

export class KillRectangle extends EditRectangle {
  public readonly id = "killRectangle";
  protected delete = true;
  protected copy = true;
}

const getEolChar = (eol: vscode.EndOfLine): string | undefined => {
  switch (eol) {
    case vscode.EndOfLine.CRLF:
      return "\r\n";
    case vscode.EndOfLine.LF:
      return "\n";
    default:
      return "\n";
  }
};

export class YankRectangle extends RectangleKillYankCommand {
  public readonly id = "yankRectangle";

  public async execute(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined
  ): Promise<void> {
    const killedRect = this.rectangleState.latestKilledRectangle;

    if (killedRect.length === 0) {
      return;
    }

    const rectHeight = killedRect.length - 1;
    const rectWidth = killedRect[rectHeight].length;

    const active = textEditor.selection.active; // Multi-cursor is not supported
    await textEditor.edit((edit) => {
      const maxLine = textEditor.document.lineCount - 1;

      const insertColumn = active.character;

      const eolChar = getEolChar(textEditor.document.eol);

      let rectLine = 0;
      while (rectLine <= rectHeight) {
        const insertLine = active.line + rectLine;
        if (insertLine > maxLine) {
          break;
        }

        const additionalColumns = Math.max(
          0,
          insertColumn - textEditor.document.lineAt(insertLine).range.end.character
        );

        const insertText = " ".repeat(additionalColumns) + killedRect[rectLine];
        edit.insert(new vscode.Position(insertLine, insertColumn), insertText);

        ++rectLine;
      }

      if (rectLine <= rectHeight) {
        const additionalText = killedRect
          .slice(rectLine)
          .map((lineText) => eolChar + " ".repeat(insertColumn) + lineText)
          .join("");
        const lastPoint = textEditor.document.lineAt(maxLine).range.end;
        edit.insert(lastPoint, additionalText);
      }
    });

    const newActive = active.translate(rectHeight, rectWidth);
    textEditor.selection = new vscode.Selection(newActive, newActive);
  }
}
