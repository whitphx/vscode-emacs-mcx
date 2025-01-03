import * as vscode from "vscode";
import { IEmacsController } from "../emulator";
import { MessageManager } from "../message";
import { EmacsCommand, ITextEditorInterruptionHandler } from ".";
import { getNonEmptySelections, makeSelectionsEmpty } from "./helpers/selection";
import { copyOrDeleteRect, insertRect, type RectangleTexts } from "../rectangle";

interface RegisterDataBase {
  type: string;
}
interface TextRegisterData extends RegisterDataBase {
  type: "text";
  text: string;
}
interface RectangleRegisterData extends RegisterDataBase {
  type: "rectangle";
  rectTexts: RectangleTexts;
}
export type RegisterData = TextRegisterData | RectangleRegisterData;
export type TextRegisters = Map<string, RegisterData>;

type RegisterCommandType = "copy" | "insert" | "copy-rectangle";
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
  override isIntermediateCommand = true;

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
  override isIntermediateCommand = true;

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

// Will be bound to C-x r r
export class PreCopyRectangleToRegister extends EmacsCommand implements ITextEditorInterruptionHandler {
  public readonly id = "preCopyRectangleToRegister";
  override isIntermediateCommand = true;

  constructor(
    emacsController: IEmacsController,
    private readonly registerCommandState: RegisterCommandState,
  ) {
    super(emacsController);
  }

  public run(): void {
    this.registerCommandState.startAcceptingRegisterKey("copy-rectangle", "Copy rectangle to register: ");
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

    const deleteRegion = prefixArgument != null;

    if (commandType === "copy") {
      return this.runCopy(textEditor, registerKey);
    } else if (commandType === "insert") {
      return this.runInsert(textEditor, registerKey);
    } else if (commandType === "copy-rectangle") {
      return this.runCopyRectangle(textEditor, registerKey, deleteRegion);
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

    this.textRegisters.set(registerKey, { type: "text", text });

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

    const dataToInsert = this.textRegisters.get(registerKey);
    if (dataToInsert == undefined) {
      return;
    }

    if (dataToInsert.type === "text") {
      await textEditor.edit((editBuilder) => {
        selections.forEach((selection) => {
          if (!selection.isEmpty) {
            editBuilder.delete(selection);
          }

          editBuilder.insert(selection.start, dataToInsert.text);
        });
      });
    } else if (dataToInsert.type === "rectangle") {
      await insertRect(textEditor, dataToInsert.rectTexts);
    }

    MessageManager.showMessage("Mark set");
  }

  // copy-rectangle-to-register, C-x r r <r>
  public async runCopyRectangle(
    textEditor: vscode.TextEditor,
    registerKey: string,
    deleteRegion: boolean,
  ): Promise<void> {
    const copiedRectTexts = await copyOrDeleteRect(this.emacsController, textEditor, {
      copy: true,
      delete: deleteRegion,
    });

    if (copiedRectTexts) {
      this.textRegisters.set(registerKey, { type: "rectangle", rectTexts: copiedRectTexts });
    }

    this.emacsController.exitMarkMode();
    makeSelectionsEmpty(textEditor);
  }
}
