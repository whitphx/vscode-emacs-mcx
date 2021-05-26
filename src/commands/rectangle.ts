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

export interface RectangleState {
  latestKilledRectangles: string[]; // VSCode supports multi-cursor
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

export class KillRectangle extends RectangleKillYankCommand {
  public readonly id = "killRectangle";

  public async execute(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined
  ): Promise<void> {
    const ranges = getNonEmptySelections(textEditor);

    const eol = getEolChar(textEditor.document.eol);

    const rectSelectionsList = ranges.map(convertSelectionToRectSelections.bind(null, textEditor.document));

    // Copy
    const rectTexts = rectSelectionsList.map((rectSelections) => {
      const rectText = rectSelections.map((lineSelection) => textEditor.document.getText(lineSelection)).join(eol);
      return rectText;
    });

    this.rectangleState.latestKilledRectangles = rectTexts;

    // Delete
    const flattenedRanges = rectSelectionsList.reduce((a, b) => a.concat(b), []);
    await deleteRanges(textEditor, flattenedRanges).then();

    revealPrimaryActive(textEditor);

    this.emacsController.exitMarkMode();
    makeSelectionsEmpty(textEditor);
  }
}
