import * as vscode from "vscode";
import { Range, TextEditor } from "vscode";
import { EmacsCommand } from ".";
import { revealPrimaryActive } from "./helpers/reveal";
import { IEmacsController } from "../emulator";
import { MessageManager } from "../message";
import { ITextEditorInterruptionHandler } from ".";

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
): vscode.Position | undefined {
  let lineIndex = active.line;
  let charIndex = active.character;
  while (lineIndex < document.lineCount) {
    const line = document.lineAt(lineIndex);
    const lineText = line.text;
    const lineRange = line.range;
    while (charIndex < lineRange.end.character) {
      const char = lineText.slice(charIndex, charIndex + stopChar.length); // Note: stopChar.length may be > 1 in some cases... e.g. surrogate pairs.
      if (char === stopChar) {
        return new vscode.Position(lineIndex, charIndex);
      }
      charIndex++;
    }
    lineIndex++;
    charIndex = 0;
  }
  return undefined;
}

export class ZapCharCommand extends EmacsCommand {
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
    // Note: prefix arg is currently ignored. The reason is that
    // a key pressed immediately after ZapToChar is interpreted
    // as a regular insertion command, not a ZapCharCommand.
    await textEditor.edit((editBuilder) => {
      textEditor.selections.forEach((selection) => {
        const active = selection.active;
        const document = textEditor.document;
        const foundPosition = findCharForward(document, active, stopChar);
        if (foundPosition) {
          editBuilder.delete(new Range(active, foundPosition.translate(0, stopChar.length)));
        }
      });
    });
    revealPrimaryActive(textEditor);
  }
}
