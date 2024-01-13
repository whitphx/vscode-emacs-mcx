import * as vscode from "vscode";
import { IEmacsController } from "../emulator";
import { MessageManager } from "../message";
import { EmacsCommand, ITextEditorInterruptionHandler } from ".";
import { getNonEmptySelections, makeSelectionsEmpty } from "./helpers/selection";

// Will bind this this to C-x r s
export class StartRegisterCopyCommand extends EmacsCommand implements ITextEditorInterruptionHandler {
  public readonly id = "startRegisterCopyCommand";

  private acceptingRegisterCopyCommand = false;

  private startRegisterCopyCommand(): void {
    this.acceptingRegisterCopyCommand = true;
    vscode.commands.executeCommand("setContext", "emacs-mcx.acceptingRectCommand", false);
    vscode.commands.executeCommand("setContext", "emacs-mcx.inRegisterCopyMode", true);

    MessageManager.showMessage("Copy to register: ");
  }

  private stopRegisterCopyCommand(): void {
    this.acceptingRegisterCopyCommand = false;
    vscode.commands.executeCommand("setContext", "emacs-mcx.inRegisterCopyMode", false);
  }

  public run(): void {
    this.startRegisterCopyCommand();
  }

  public onDidInterruptTextEditor(): void {
    if (this.acceptingRegisterCopyCommand) {
      this.stopRegisterCopyCommand();
    }
  }
}

// Will bind this this to C-x r i
export class StartRegisterInsertCommand extends EmacsCommand implements ITextEditorInterruptionHandler {
  public readonly id = "startRegisterInsertCommand";

  private acceptingRegisterInsertCommand = false;

  public startRegisterInsertCommand(): void {
    this.acceptingRegisterInsertCommand = true;
    vscode.commands.executeCommand("setContext", "emacs-mcx.acceptingRectCommand", false);
    vscode.commands.executeCommand("setContext", "emacs-mcx.inRegisterInsertMode", true);

    MessageManager.showMessage("Insert from register: ");
  }

  private stopRegisterInsertCommand(): void {
    this.acceptingRegisterInsertCommand = false;
    vscode.commands.executeCommand("setContext", "emacs-mcx.inRegisterInsertMode", false);
  }

  public run(): void {
    this.startRegisterInsertCommand();
  }

  public onDidInterruptTextEditor(): void {
    if (this.acceptingRegisterInsertCommand) {
      this.stopRegisterInsertCommand();
    }
  }
}

export class CopyToRegister extends EmacsCommand {
  public readonly id = "copyToRegister";

  constructor(
    emacsController: IEmacsController,
    private readonly textRegister: Map<string, string>,
  ) {
    super(emacsController);
  }

  public run(
    textEditor: vscode.TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
    args?: unknown[],
  ): void | Thenable<void> {
    const arg = args?.[0];
    if (typeof arg !== "string") {
      return;
    }

    const selectionsAfterRectDisabled =
      this.emacsController.inRectMarkMode &&
      this.emacsController.nativeSelections.map((selection) => {
        const newLine = selection.active.line;
        const newChar = Math.min(selection.active.character, selection.anchor.character);
        return new vscode.Selection(newLine, newChar, newLine, newChar);
      });
    const selections = getNonEmptySelections(textEditor);
    if (selectionsAfterRectDisabled) {
      textEditor.selections = selectionsAfterRectDisabled;
    }
    // selections is now a list of non empty selections, iterate through them and
    // build a single variable combinedtext
    let i = 0;
    let combinedtext = "";
    while (i < selections.length) {
      combinedtext = combinedtext + textEditor.document.getText(selections[i]);
      i++;
    }

    const register_string = arg;
    if (register_string == null) {
      return;
    }

    this.textRegister.set(register_string, combinedtext);
    // After copying the selection, get out of mark mode and de-select the selections
    this.emacsController.exitMarkMode();
    makeSelectionsEmpty(textEditor);
  }
}

export class InsertRegister extends EmacsCommand {
  public readonly id = "insertRegister";

  constructor(
    emacsController: IEmacsController,
    private readonly textRegister: Map<string, string>,
  ) {
    super(emacsController);
  }

  public async run(
    textEditor: vscode.TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
    args?: unknown[],
  ): Promise<void> {
    const arg = args?.[0];
    if (typeof arg !== "string") {
      return;
    }

    if (!this.textRegister.has(arg)) {
      return;
    }

    const textToInsert = this.textRegister.get(arg);
    if (textToInsert == undefined) {
      return;
    }
    // Looking for how to insert-replace with selections highlighted.... must copy-paste from Yank command
    const selections = textEditor.selections;

    await textEditor.edit((editBuilder) => {
      selections.forEach((selection) => {
        if (!selection.isEmpty) {
          editBuilder.delete(selection);
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        editBuilder.insert(selection.start, textToInsert);
      });
    });
  }
}
