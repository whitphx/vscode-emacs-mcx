import * as vscode from "vscode";
import { IEmacsController } from "../emulator";
import { MessageManager } from "../message";
import { EmacsCommand, ITextEditorInterruptionHandler } from ".";
import { getNonEmptySelections, makeSelectionsEmpty } from "./helpers/selection";

export type TextRegisters = Map<string, string>;

type RegisterCommandType = "copy" | "insert";
export class RegisterCommandState {
  private _acceptingRegisterCommand: RegisterCommandType | null = null;
  public get acceptingRegisterCommand(): RegisterCommandType | null {
    return this._acceptingRegisterCommand;
  }

  public startAcceptingRegisterKey(commandType: RegisterCommandType, message: string): void {
    this._acceptingRegisterCommand = commandType;
    vscode.commands.executeCommand("setContext", "emacs-mcx.acceptingRectCommand", false);
    vscode.commands.executeCommand("setContext", "emacs-mcx.acceptingRegisterCommand", true);

    MessageManager.showMessage(message);
  }

  public stopAcceptingRegisterKey(): void {
    if (this._acceptingRegisterCommand) {
      this._acceptingRegisterCommand = null;
      vscode.commands.executeCommand("setContext", "emacs-mcx.acceptingRegisterCommand", false);
      MessageManager.removeMessage();
    }
  }
}

// Will be bound to C-x r s
export class PreCopyToRegister extends EmacsCommand implements ITextEditorInterruptionHandler {
  public readonly id = "preCopyToRegister";

  constructor(
    emacsController: IEmacsController,
    private readonly registerCommandState: RegisterCommandState,
  ) {
    super(emacsController);
  }

  public run(): void {
    this.registerCommandState.startAcceptingRegisterKey("copy", "Copy to register: ");
  }

  public onDidInterruptTextEditor(): void {
    this.registerCommandState.stopAcceptingRegisterKey();
  }
}

// Will be bound to C-x r i
export class PreInsertRegister extends EmacsCommand implements ITextEditorInterruptionHandler {
  public readonly id = "preInsertRegister";

  constructor(
    emacsController: IEmacsController,
    private readonly registerCommandState: RegisterCommandState,
  ) {
    super(emacsController);
  }

  public run(): void {
    this.registerCommandState.startAcceptingRegisterKey("insert", "Insert from register: ");
  }

  public onDidInterruptTextEditor(): void {
    this.registerCommandState.stopAcceptingRegisterKey();
  }
}

// Will be bound to all characters (a, b, c, ...) following the commands above (C-x r s, C-x r i) making use of the acceptingRegisterKey context.
export class SomeRegisterCommand extends EmacsCommand {
  public readonly id = "someRegisterCommand";

  constructor(
    emacsController: IEmacsController,
    private readonly textRegisters: TextRegisters,
    private readonly registerCommandState: RegisterCommandState,
  ) {
    super(emacsController);
  }

  public run(
    textEditor: vscode.TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
    args?: unknown[],
  ): void | Thenable<void> {
    const commandType = this.registerCommandState.acceptingRegisterCommand;
    if (!commandType) {
      return;
    }

    this.registerCommandState.stopAcceptingRegisterKey();

    const registerKey = args?.[0];
    if (typeof registerKey !== "string") {
      return;
    }

    if (commandType === "copy") {
      return this.runCopy(textEditor, registerKey);
    } else if (commandType === "insert") {
      return this.runInsert(textEditor, registerKey);
    }
  }

  // copy-to-register, C-x r s <r>
  public runCopy(textEditor: vscode.TextEditor, registerKey: string): void | Thenable<void> {
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
    let combinedText = "";
    while (i < selections.length) {
      combinedText = combinedText + textEditor.document.getText(selections[i]);
      i++;
    }

    this.textRegisters.set(registerKey, combinedText);
    // After copying the selection, get out of mark mode and de-select the selections
    this.emacsController.exitMarkMode();
    makeSelectionsEmpty(textEditor);
  }

  // insert-register, C-x r i <r>
  public async runInsert(textEditor: vscode.TextEditor, registerKey: string): Promise<void> {
    const selections = textEditor.selections;

    this.emacsController.pushMark(selections.map((s) => s.active));

    if (!this.textRegisters.has(registerKey)) {
      MessageManager.showMessage("Register does not contain text");
      return;
    }

    const textToInsert = this.textRegisters.get(registerKey);
    if (textToInsert == undefined) {
      return;
    }

    await textEditor.edit((editBuilder) => {
      selections.forEach((selection) => {
        if (!selection.isEmpty) {
          editBuilder.delete(selection);
        }

        editBuilder.insert(selection.start, textToInsert);
      });
    });

    MessageManager.showMessage("Mark set");
  }
}
