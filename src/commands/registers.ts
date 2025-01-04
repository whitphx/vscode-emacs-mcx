import * as vscode from "vscode";
import { IEmacsController } from "../emulator";
import { MessageManager } from "../message";
import { EmacsCommand, ITextEditorInterruptionHandler } from ".";
import { getNonEmptySelections, makeSelectionsEmpty } from "./helpers/selection";

export type TextRegisters = Map<string, string>;
export type PositionRegisters = Map<string, readonly vscode.Position[]>;

type RegisterCommandType = "copy" | "insert" | "point" | "jump";
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
// Will be bound to C-x r SPC
export class PrePointToRegister extends EmacsCommand implements ITextEditorInterruptionHandler {
  public readonly id = "prePointToRegister";

  constructor(
    emacsController: IEmacsController,
    private readonly registerCommandState: RegisterCommandState,
  ) {
    super(emacsController);
  }

  public run(): void {
    this.registerCommandState.startAcceptingRegisterKey("point", "Point to register: ");
  }

  public onDidInterruptTextEditor(): void {
    this.registerCommandState.stopAcceptingRegisterKey();
  }
}

// Will be bound to C-x r j
export class PreJumpToRegister extends EmacsCommand implements ITextEditorInterruptionHandler {
  public readonly id = "preJumpToRegister";

  constructor(
    emacsController: IEmacsController,
    private readonly registerCommandState: RegisterCommandState,
  ) {
    super(emacsController);
  }

  public run(): void {
    this.registerCommandState.startAcceptingRegisterKey("jump", "Jump to register: ");
  }

  public onDidInterruptTextEditor(): void {
    this.registerCommandState.stopAcceptingRegisterKey();
  }
}

export class SomeRegisterCommand extends EmacsCommand {
  public readonly id = "someRegisterCommand";

  constructor(
    emacsController: IEmacsController,
    private readonly textRegisters: TextRegisters,
    private readonly positionRegisters: PositionRegisters,
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
    } else if (commandType === "point") {
      return this.runPoint(textEditor, registerKey);
    } else if (commandType === "jump") {
      return this.runJump(textEditor, registerKey);
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

    const texts = selections.map((selection) => textEditor.document.getText(selection));
    const text = texts.join(""); // TODO: Deal with the multi-cursor case like the kill-yank commands.

    this.textRegisters.set(registerKey, text);

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

  // point-to-register, C-x r SPC <r>
  public runPoint(textEditor: vscode.TextEditor, registerKey: string): void {
    const positions = textEditor.selections.map((selection) => selection.active);
    this.positionRegisters.set(registerKey, positions);

    this.emacsController.exitMarkMode();
    MessageManager.showMessage(`Point saved to register ${registerKey}`);
  }

  // jump-to-register, C-x r j <r>
  public runJump(textEditor: vscode.TextEditor, registerKey: string): void {
    if (!this.positionRegisters.has(registerKey)) {
      MessageManager.showMessage("Register does not contain a position");
      return;
    }

    const positions = this.positionRegisters.get(registerKey);
    if (positions == undefined) {
      return;
    }

    textEditor.selections = positions.map((pos) => new vscode.Selection(pos, pos));
    this.emacsController.exitMarkMode();
    MessageManager.showMessage(`Jumped to position in register ${registerKey}`);
  }
}
