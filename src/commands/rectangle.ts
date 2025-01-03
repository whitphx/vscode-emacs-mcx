import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { EmacsCommand, ITextEditorInterruptionHandler } from ".";
import { IEmacsController } from "../emulator";
import { getNonEmptySelections, makeSelectionsEmpty } from "./helpers/selection";
import { convertSelectionToRectSelections, copyOrDeleteRect, insertRect, type RectangleTexts } from "../rectangle";
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
  override isIntermediateCommand = true;

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

export interface RectangleState {
  latestKilledRectangle: RectangleTexts; // multi-cursor is not supported
}

export abstract class RectangleKillYankCommand extends EmacsCommand {
  protected rectangleState: RectangleState;

  public constructor(emacsController: IEmacsController, rectangleState: RectangleState) {
    super(emacsController);

    this.rectangleState = rectangleState;
  }
}

export class DeleteRectangle extends RectangleKillYankCommand {
  public readonly id = "deleteRectangle";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    await copyOrDeleteRect(this.emacsController, textEditor, {
      copy: false,
      delete: true,
    });
  }
}

export class CopyRectangleAsKill extends RectangleKillYankCommand {
  public readonly id = "copyRectangleAsKill";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const copiedRectTexts = await copyOrDeleteRect(this.emacsController, textEditor, {
      copy: true,
      delete: false,
    });
    if (copiedRectTexts !== null) {
      this.rectangleState.latestKilledRectangle = copiedRectTexts;
    }
  }
}

export class KillRectangle extends RectangleKillYankCommand {
  public readonly id = "killRectangle";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const copiedRectTexts = await copyOrDeleteRect(this.emacsController, textEditor, {
      copy: true,
      delete: true,
    });
    if (copiedRectTexts !== null) {
      this.rectangleState.latestKilledRectangle = copiedRectTexts;
    }
  }
}

export class YankRectangle extends RectangleKillYankCommand {
  public readonly id = "yankRectangle";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const killedRect = this.rectangleState.latestKilledRectangle;

    return insertRect(textEditor, killedRect);
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
      // Multiple cursors not supported
      return;
    }
    const selection = selections[0]!;

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
