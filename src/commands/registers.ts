import * as vscode from "vscode";
import { IEmacsController } from "../emulator";
import { MessageManager } from "../message";
import { EmacsCommand, ITextEditorInterruptionHandler } from ".";
import { getNonEmptySelections, makeSelectionsEmpty } from "./helpers/selection";
import { copyOrDeleteRect, insertRect, type RectangleTexts } from "../rectangle";
import { deleteRanges } from "../utils";
import { revealPrimaryActive } from "./helpers/reveal";

interface RegisterEntryBase {
  type: string;
}
interface TextRegisterEntry extends RegisterEntryBase {
  type: "text";
  text: string;
}
interface RectangleRegisterEntry extends RegisterEntryBase {
  type: "rectangle";
  rectTexts: RectangleTexts;
}
interface PointRegisterEntry extends RegisterEntryBase {
  type: "point";
  buffer: vscode.Uri;
  points: vscode.Position[];
}
export type RegisterEntry = TextRegisterEntry | RectangleRegisterEntry | PointRegisterEntry;
export type Registers = Map<string, RegisterEntry>;

type RegisterCommandType = "copy" | "insert" | "copy-rectangle" | "point" | "jump";
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

// Will be bound to C-x r SPC
export class PrePointToRegister extends EmacsCommand implements ITextEditorInterruptionHandler {
  public readonly id = "prePointToRegister";
  override isIntermediateCommand = true;

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
  override isIntermediateCommand = true;

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

// Will be bound to all characters (a, b, c, ...) following the commands above (C-x r s, C-x r i) making use of the acceptingRegisterKey context.
export class SomeRegisterCommand extends EmacsCommand {
  public readonly id = "someRegisterCommand";

  constructor(
    emacsController: IEmacsController,
    private readonly registers: Registers,
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
    if (typeof registerKey !== "string" || registerKey.length !== 1) {
      return;
    }

    const deleteRegion = prefixArgument != null;

    if (commandType === "copy") {
      return this.runCopy(textEditor, registerKey, deleteRegion);
    } else if (commandType === "insert") {
      return this.runInsert(textEditor, registerKey);
    } else if (commandType === "copy-rectangle") {
      return this.runCopyRectangle(textEditor, registerKey, deleteRegion);
    } else if (commandType === "point") {
      return this.runPoint(textEditor, registerKey);
    } else if (commandType === "jump") {
      return this.runJump(textEditor, registerKey);
    }
  }

  // copy-to-register, C-x r s <r>
  public async runCopy(textEditor: vscode.TextEditor, registerKey: string, deleteRegion: boolean): Promise<void> {
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

    if (deleteRegion) {
      await deleteRanges(textEditor, selections);
      revealPrimaryActive(textEditor);
    }

    this.registers.set(registerKey, { type: "text", text });

    this.emacsController.exitMarkMode();
    makeSelectionsEmpty(textEditor);
  }

  // insert-register, C-x r i <r>
  public async runInsert(textEditor: vscode.TextEditor, registerKey: string): Promise<void> {
    const selections = textEditor.selections;

    this.emacsController.pushMark(selections.map((s) => s.active));

    const dataToInsert = this.registers.get(registerKey);
    if (dataToInsert == null) {
      MessageManager.showMessage("Register does not contain text");
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
      this.registers.set(registerKey, { type: "rectangle", rectTexts: copiedRectTexts });
    }

    this.emacsController.exitMarkMode();
    makeSelectionsEmpty(textEditor);
  }

  // point-to-register, C-x r SPC <r>
  public async runPoint(textEditor: vscode.TextEditor, registerKey: string): Promise<void> {
    const points = textEditor.selections.map((selection) => selection.active);
    this.registers.set(registerKey, {
      type: "point",
      buffer: textEditor.document.uri,
      points,
    });
  }

  // jump-to-register, C-x r j <r>
  public async runJump(textEditor: vscode.TextEditor, registerKey: string): Promise<void> {
    const data = this.registers.get(registerKey);
    if (data == undefined || data.type !== "point") {
      MessageManager.showMessage("Register doesn't contain a buffer position or configuration");
      return;
    }

    const document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === data.buffer.toString());
    if (!document) {
      MessageManager.showMessage("That register's buffer no longer exists");
      return;
    }

    const selections = data.points.map((point) => new vscode.Selection(point, point)); // XXX: This behavior is a bit different from the original Emacs when the buffer is in mark mode.

    await vscode.window.showTextDocument(document, { selection: selections[0] });
    if (vscode.window.activeTextEditor) {
      vscode.window.activeTextEditor.selections = selections;
    }
  }
}
