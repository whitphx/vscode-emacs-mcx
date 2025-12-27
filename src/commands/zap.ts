import * as vscode from "vscode";
import { Range, TextEditor } from "vscode";
import { EmacsCommand } from ".";
import { revealPrimaryActive } from "./helpers/reveal";
import { IEmacsController } from "../emulator";
import { MessageManager } from "../message";
import { ITextEditorInterruptionHandler } from ".";
import { Logger } from "../logger";
import { KillYankCommand } from "./kill";

const logger = Logger.get("ZapCommand");

export class ZapCommandState {
  private accepting: boolean = false;

  public startAccepting(message: string): void {
    this.accepting = true;
    vscode.commands.executeCommand("setContext", "emacs-mcx.acceptingZapCommand", true);
    MessageManager.showMessage(message);
  }

  public stopAccepting(): void {
    if (this.accepting) {
      this.accepting = false;
      vscode.commands.executeCommand("setContext", "emacs-mcx.acceptingZapCommand", false);
      MessageManager.removeMessage();
    }
  }
}

// Will be bound to M-z.
export class ZapToChar extends EmacsCommand implements ITextEditorInterruptionHandler {
  public readonly id = "zapToChar";
  override isIntermediateCommand = true;

  constructor(
    emacsController: IEmacsController,
    private readonly zapCommandState: ZapCommandState,
  ) {
    super(emacsController);
  }

  public run(): void {
    this.zapCommandState.startAccepting("Zap to char:");
  }

  public onDidInterruptTextEditor(): void {
    this.zapCommandState.stopAccepting();
  }
}

// Find the first occurrence of stopChar at or after the given position.
export function findCharForward(
  document: vscode.TextDocument,
  active: vscode.Position,
  stopChar: string,
  repeat: number,
): vscode.Position | undefined {
  let lineIndex = active.line;
  let charIndex = active.character;
  let count = 0;
  if (repeat === 0) {
    return undefined;
  } else if (repeat > 0) {
    while (lineIndex < document.lineCount) {
      const line = document.lineAt(lineIndex);
      const lineText = line.text;
      const lineRange = line.range;
      while (charIndex < lineRange.end.character) {
        const char = lineText.slice(charIndex, charIndex + stopChar.length); // Note: stopChar.length may be > 1 in some cases... e.g. surrogate pairs.
        if (char === stopChar) {
          count++;
          if (count === repeat) {
            return new vscode.Position(lineIndex, charIndex);
          }
        }
        charIndex++;
      }
      lineIndex++;
      charIndex = 0;
    }
  } else {
    // repeat < 0
    repeat = -repeat;
    lineIndex = active.line;
    charIndex = active.character;
    while (lineIndex >= 0) {
      const line = document.lineAt(lineIndex);
      const lineText = line.text;
      while (charIndex >= stopChar.length) {
        const char = lineText.slice(charIndex - stopChar.length, charIndex); // Note: stopChar.length may be > 1 in some cases... e.g. surrogate pairs.
        if (char === stopChar) {
          count++;
          if (count === repeat) {
            return new vscode.Position(lineIndex, charIndex - stopChar.length);
          }
        }
        charIndex--;
      }
      lineIndex--;
      if (lineIndex >= 0) {
        const prevLine = document.lineAt(lineIndex);
        charIndex = prevLine.range.end.character;
      }
    }
  }
  return undefined;
}

export class ZapCharCommand extends KillYankCommand {
  public readonly id = "zapCharCommand";

  public async run(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
    args?: unknown,
  ): Promise<void> {
    if (typeof args !== "string") {
      return;
    }
    const stopChar = args;

    if (stopChar.length !== 1) {
      logger.warn("stopChar length is not 1");
      // We can assume `stopChar` is a single character and it's not a surrogate pair
      // because all possible characters are defined in the keybinding generator and they are only ASCII characters.
      return;
    }

    const repeat = prefixArgument ?? 1;

    const document = textEditor.document;
    const killRanges = textEditor.selections
      .map((selection) => {
        const foundPosition = findCharForward(document, selection.active, stopChar, repeat);
        if (foundPosition) {
          return new Range(selection.active, foundPosition.translate(0, stopChar.length));
        }
      })
      .filter((range): range is Range => range !== undefined);

    if (killRanges.length === 0) {
      return;
    }
    await this.killYanker.kill(killRanges, false);

    revealPrimaryActive(textEditor);
  }
}
