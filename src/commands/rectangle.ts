import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { EmacsCommand, ITextEditorInterruptionHandler } from ".";
import { IEmacsController } from "../emulator";
import { getNonEmptySelections, makeSelectionsEmpty } from "./helpers/selection";
import { convertSelectionToRectSelections } from "../rectangle";
import { revealPrimaryActive } from "./helpers/reveal";
import { KillRing } from "../kill-yank/kill-ring";
import { Minibuffer } from "src/minibuffer";

/**
 * This command is assigned to `C-x r` and sets `emacs-mcx.acceptingRectCommand` context
 * to simulate the original keybindings like `C-x r k` as VSCode does not natively support
 * such continuous key sequences without modifiers.
 * In the example above, `kill-rectangle` command is assigned to a single `k` key
 * with `{ "when": "emacs-mcx.acceptingRectCommand" }` condition.
 * Then, `kill-rectangle` can be executed through `C-x r k`.
 */
export class StartAcceptingRectCommand extends EmacsCommand implements ITextEditorInterruptionHandler {
  public readonly id = "startAcceptingRectCommand";

  private acceptingRectCommand = false;

  private startAcceptingRectCommand(): void {
    this.acceptingRectCommand = true;
    vscode.commands.executeCommand("setContext", "emacs-mcx.acceptingRectCommand", true);
  }

  private stopAcceptingRectCommand(): void {
    this.acceptingRectCommand = false;
    vscode.commands.executeCommand("setContext", "emacs-mcx.acceptingRectCommand", false);
  }

  public run(): void {
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

  public constructor(emacsController: IEmacsController, rectangleState: RectangleState) {
    super(emacsController);

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

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const selections = getNonEmptySelections(textEditor);

    if (selections.length !== 1) {
      // multiple cursor not supported
      return;
    }
    const selection = selections[0]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion

    const notReversedSelection = new vscode.Selection(selection.start, selection.end);

    const rectSelections = convertSelectionToRectSelections(textEditor.document, notReversedSelection);

    // Copy
    if (this.copy) {
      const rectText = rectSelections.map((lineSelection) => textEditor.document.getText(lineSelection));

      this.rectangleState.latestKilledRectangle = rectText;
    }

    // Delete
    if (this.delete) {
      await deleteRanges(textEditor, rectSelections);

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

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const killedRect = this.rectangleState.latestKilledRectangle;

    if (killedRect.length === 0) {
      return;
    }

    const rectHeight = killedRect.length - 1;
    const rectWidth = killedRect[rectHeight]!.length; // eslint-disable-line @typescript-eslint/no-non-null-assertion

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
          insertColumn - textEditor.document.lineAt(insertLine).range.end.character,
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

export class OpenRectangle extends EmacsCommand {
  public readonly id = "openRectangle";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const selections = getNonEmptySelections(textEditor);
    if (selections.length === 0) {
      return;
    }

    const starts = textEditor.selections.map((selection) => selection.start);

    const rectSelections = selections
      .map(convertSelectionToRectSelections.bind(null, textEditor.document))
      .reduce((a, b) => a.concat(b), []);
    await textEditor.edit((edit) => {
      rectSelections.forEach((rectSelection) => {
        const length = rectSelection.end.character - rectSelection.start.character;
        edit.insert(rectSelection.start, " ".repeat(length));
      });
    });

    this.emacsController.exitMarkMode();
    textEditor.selections = starts.map((s) => new vscode.Selection(s, s));
  }
}

export class ClearRectangle extends EmacsCommand {
  public readonly id = "clearRectangle";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const selections = getNonEmptySelections(textEditor);
    if (selections.length === 0) {
      return;
    }

    const rectSelections = selections
      .map(convertSelectionToRectSelections.bind(null, textEditor.document))
      .reduce((a, b) => a.concat(b), []);
    await textEditor.edit((edit) => {
      rectSelections.forEach((rectSelection) => {
        const length = rectSelection.end.character - rectSelection.start.character;
        edit.replace(rectSelection, " ".repeat(length));
      });
    });

    this.emacsController.exitMarkMode();
    makeSelectionsEmpty(textEditor);
  }
}

export class StringRectangle extends EmacsCommand {
  public readonly id = "stringRectangle";

  private minibuffer: Minibuffer;

  constructor(markModeController: IEmacsController, minibuffer: Minibuffer) {
    super(markModeController);
    this.minibuffer = minibuffer;
  }

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const replaceString = await this.minibuffer.readFromMinibuffer({ prompt: "String rectangle" });

    if (replaceString == null) {
      return;
    }

    const selections = getNonEmptySelections(textEditor);
    if (selections.length === 0) {
      return;
    }

    const rectSelections = selections
      .map(convertSelectionToRectSelections.bind(null, textEditor.document))
      .reduce((a, b) => a.concat(b), []);
    await textEditor.edit((edit) => {
      rectSelections.forEach((rectSelection) => {
        edit.replace(rectSelection, replaceString);
      });
    });

    this.emacsController.exitMarkMode();
    makeSelectionsEmpty(textEditor);
  }
}

export class ReplaceKillRingToRectangle extends EmacsCommand {
  public readonly id = "replaceKillRingToRectangle";
  private killring: KillRing | null;

  public constructor(emacsController: IEmacsController, killring: KillRing | null) {
    super(emacsController);
    this.killring = killring;
  }

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    if (this.killring === null) {
      return;
    }
    const top = this.killring.getTop();
    if (top == null) {
      return;
    }
    const text = top.asString();
    // only support one line which isn't empty
    if (text === "" || text.indexOf("\n") !== -1) {
      return;
    }

    const selections = getNonEmptySelections(textEditor);

    if (selections.length !== 1) {
      // multiple cursor not supported
      return;
    }
    const selection = selections[0]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion

    const insertChar = Math.min(selection.start.character, selection.end.character);
    const finalCursorLine = selection.active.line;
    let finalCursorChar = insertChar;
    if (selection.active.character >= selection.anchor.character) {
      finalCursorChar = insertChar + text.length;
    }

    const currentRect = convertSelectionToRectSelections(textEditor.document, selection);
    // rect is reversed in previous convert,
    // so we reverse it again as we need to traverse from smaller line number
    if (selection.active.line < selection.anchor.line) {
      currentRect.reverse();
    }

    const lineStart = Math.max(selection.start.line, 0);
    const lineEnd = Math.min(selection.end.line, textEditor.document.lineCount - 1);
    await textEditor.edit((edit) => {
      for (let i = lineStart; i <= lineEnd; i++) {
        // Both `currentRect` and (`lineStart`, `lineEnd`) are calculated
        // based on the same information from the `selection` and the `textEditor`'s range,
        // so the `noUncheckedIndexedAccess` rule can be skipped here.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const rgn = currentRect[i - lineStart]!;
        if (rgn.end.character < insertChar) {
          const fill = insertChar - rgn.end.character;
          edit.insert(new vscode.Position(i, rgn.end.character), " ".repeat(fill) + text);
        } else {
          edit.replace(rgn, text);
        }
      }
    });

    this.emacsController.exitMarkMode();

    const finalCursor = new vscode.Position(finalCursorLine, finalCursorChar);
    textEditor.selections = [new vscode.Selection(finalCursor, finalCursor)];
  }
}
