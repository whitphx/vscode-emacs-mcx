import * as vscode from "vscode";
import { IEmacsController } from "../emulator";
import { MessageManager } from "../message";
import { EmacsCommand, ITextEditorInterruptionHandler } from ".";
import { getNonEmptySelections, makeSelectionsEmpty } from "./helpers/selection";
import { copyOrDeleteRect, insertRect, type RectangleTexts } from "../rectangle";
import { deleteRanges } from "../utils";
import { revealPrimaryActive } from "./helpers/reveal";

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
interface PositionRegisterData extends RegisterDataBase {
  type: "positions";
  positions: ReadonlyArray<vscode.Position>;
}
export type RegisterData = TextRegisterData | RectangleRegisterData | PositionRegisterData;
export type Registers = Map<string, RegisterData>;
export type TextRegisters = Registers; // Maintain backward compatibility

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
      MessageManager.showMessage("Invalid register key");
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
    const nonEmptySelections = getNonEmptySelections(textEditor);

    // If there are no non-empty selections, store an empty string
    if (nonEmptySelections.length === 0) {
      this.registers.set(registerKey, { type: "text", text: "" });
      this.emacsController.exitMarkMode();
      makeSelectionsEmpty(textEditor);
      return;
    }

    const texts = nonEmptySelections.map((selection) => textEditor.document.getText(selection));
    const text = texts.join(""); // TODO: Deal with the multi-cursor case like the kill-yank commands.

    if (deleteRegion) {
      await deleteRanges(textEditor, nonEmptySelections);
      revealPrimaryActive(textEditor);
    }

    // Store text in register with correct type
    const registerData: TextRegisterData = { type: "text", text };
    this.registers.set(registerKey, registerData);

    this.emacsController.exitMarkMode();
    makeSelectionsEmpty(textEditor);
  }

  // insert-register, C-x r i <r>
  public async runInsert(textEditor: vscode.TextEditor, registerKey: string): Promise<void> {
    const selections = textEditor.selections;

    // Save current positions before inserting
    this.emacsController.pushMark(selections.map((s) => s.active));

    if (!this.registers.has(registerKey)) {
      MessageManager.showMessage("Register does not contain text");
      return;
    }

    const dataToInsert = this.registers.get(registerKey);
    if (!dataToInsert) {
      return;
    }

    // Handle text and rectangle data types with proper type checking
    if (dataToInsert.type === "text") {
      const text = dataToInsert.text ?? ""; // Use empty string if text is undefined
      await textEditor.edit((editBuilder) => {
        selections.forEach((selection) => {
          if (!selection.isEmpty) {
            editBuilder.delete(selection);
          }
          editBuilder.insert(selection.start, text);
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
    // Save all cursor positions as new Position objects to ensure immutability
    const positions = textEditor.selections.map(
      (selection) => new vscode.Position(selection.active.line, selection.active.character),
    );
    this.registers.set(registerKey, {
      type: "positions",
      positions: positions,
    });
    // Keep selections empty at current positions
    makeSelectionsEmpty(textEditor);
    MessageManager.showMessage("Position saved in register");
  }

  // jump-to-register, C-x r j <r>
  public async runJump(textEditor: vscode.TextEditor, registerKey: string): Promise<void> {
    if (!this.registers.has(registerKey)) {
      MessageManager.showMessage("Register does not contain a position");
      return;
    }

    const data = this.registers.get(registerKey);
    if (data?.type !== "positions") {
      MessageManager.showMessage("Register does not contain a position");
      return;
    }

    // Save current positions to mark ring before jumping
    const currentPositions = textEditor.selections.map((s) => new vscode.Position(s.active.line, s.active.character));

    if (currentPositions.length === 0) {
      MessageManager.showMessage("No valid current positions");
      return;
    }

    if (!data.positions || data.positions.length === 0) {
      MessageManager.showMessage("No position stored in this register");
      return;
    }

    // Set mark at current position before jumping
    const firstCurrentPosition = currentPositions[0];
    if (!(firstCurrentPosition instanceof vscode.Position)) {
      MessageManager.showMessage("Invalid current position");
      return;
    }
    this.emacsController.enterMarkMode();
    this.emacsController.pushMark(currentPositions);

    // Create selections with current position as anchor and register position as active
    const validPositions = data.positions.filter((pos): pos is vscode.Position => pos instanceof vscode.Position);
    textEditor.selections = validPositions.map((pos) => new vscode.Selection(firstCurrentPosition, pos));
    revealPrimaryActive(textEditor);
    MessageManager.showMessage("Mark set");
  }
}

// copy-to-register, C-x r s <r>
export class CopyToRegister extends EmacsCommand {
  public readonly id = "copyToRegister";

  constructor(
    emacsController: IEmacsController,
    private readonly registers: Registers,
    private readonly registerCommandState: RegisterCommandState,
  ) {
    super(emacsController);
  }

  public async run(
    textEditor: vscode.TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
    args?: unknown[],
  ): Promise<void> {
    const registerKey = args?.[0];
    if (typeof registerKey !== "string") {
      return;
    }

    const deleteRegion = prefixArgument != null;

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
}

// copy-rectangle-to-register, C-x r r <r>
export class CopyRectangleToRegister extends EmacsCommand {
  public readonly id = "copyRectangleToRegister";

  constructor(
    emacsController: IEmacsController,
    private readonly registers: Registers,
    private readonly registerCommandState: RegisterCommandState,
  ) {
    super(emacsController);
  }

  public async run(
    textEditor: vscode.TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
    args?: unknown[],
  ): Promise<void> {
    const registerKey = args?.[0];
    if (typeof registerKey !== "string") {
      return;
    }

    const deleteRegion = prefixArgument != null;

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
}

// point-to-register, C-x r SPC <r>
export class PointToRegister extends EmacsCommand {
  public readonly id = "pointToRegister";

  constructor(
    emacsController: IEmacsController,
    private readonly registers: Registers,
    private readonly registerCommandState: RegisterCommandState,
  ) {
    super(emacsController);
  }

  public async run(
    textEditor: vscode.TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
    args?: unknown[],
  ): Promise<void> {
    const registerKey = args?.[0];
    if (typeof registerKey !== "string") {
      return;
    }

    // Save all cursor positions as new Position objects to ensure immutability
    const positions = textEditor.selections.map(
      (selection) => new vscode.Position(selection.active.line, selection.active.character),
    );

    if (positions.length === 0) {
      MessageManager.showMessage("No valid positions to save");
      return;
    }

    this.registers.set(registerKey, {
      type: "positions",
      positions: positions,
    });
    // Keep selections empty at current positions
    makeSelectionsEmpty(textEditor);
    MessageManager.showMessage("Position saved in register");
  }
}

// jump-to-register, C-x r j <r>
export class InsertRegister extends EmacsCommand {
  public readonly id = "insertRegister";

  constructor(
    emacsController: IEmacsController,
    private readonly registers: Registers,
    private readonly registerCommandState: RegisterCommandState,
  ) {
    super(emacsController);
  }

  public async run(
    textEditor: vscode.TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
    args?: unknown[],
  ): Promise<void> {
    const registerKey = args?.[0];
    if (typeof registerKey !== "string") {
      return;
    }

    if (!this.registers.has(registerKey)) {
      MessageManager.showMessage("Register does not contain text");
      return;
    }

    const data = this.registers.get(registerKey);
    if (!data) {
      return;
    }

    // Save current positions before inserting
    this.emacsController.pushMark(textEditor.selections.map((s) => s.active));

    // Handle text and rectangle data types with proper type checking
    if (data.type === "text") {
      const text = data.text ?? ""; // Use empty string if text is undefined
      await textEditor.edit((editBuilder) => {
        textEditor.selections.forEach((selection) => {
          if (!selection.isEmpty) {
            editBuilder.delete(selection);
          }
          editBuilder.insert(selection.start, text);
        });
      });
    } else if (data.type === "rectangle") {
      // Handle rectangle data
      await insertRect(textEditor, data.rectTexts);
    }

    makeSelectionsEmpty(textEditor);
    revealPrimaryActive(textEditor);
  }
}

export class JumpToRegister extends EmacsCommand {
  public readonly id = "jumpToRegister";

  constructor(
    emacsController: IEmacsController,
    private readonly registers: Registers,
    private readonly registerCommandState: RegisterCommandState,
  ) {
    super(emacsController);
  }

  public async run(
    textEditor: vscode.TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
    args?: unknown[],
  ): Promise<void> {
    const registerKey = args?.[0];
    if (typeof registerKey !== "string") {
      return;
    }

    if (!this.registers.has(registerKey)) {
      MessageManager.showMessage("Register does not contain a position");
      return;
    }

    const data = this.registers.get(registerKey);
    if (data?.type !== "positions") {
      MessageManager.showMessage("Register does not contain a position");
      return;
    }

    // Save current positions before jumping
    const currentPositions = textEditor.selections.map(
      (sel) => new vscode.Position(sel.active.line, sel.active.character),
    );

    if (currentPositions.length === 0 || !data.positions || data.positions.length === 0) {
      MessageManager.showMessage("No position to jump to");
      return;
    }

    // Set mark at current position before jumping
    const firstCurrentPosition = currentPositions[0];
    if (!(firstCurrentPosition instanceof vscode.Position)) {
      MessageManager.showMessage("Invalid current position");
      return;
    }
    this.emacsController.pushMark(currentPositions);
    this.emacsController.enterMarkMode();

    // Create selections with current position as anchor and register position as active
    const validPositions = data.positions.filter((pos): pos is vscode.Position => pos instanceof vscode.Position);
    textEditor.selections = validPositions.map((pos) => new vscode.Selection(firstCurrentPosition, pos));
    revealPrimaryActive(textEditor);

    MessageManager.showMessage("Mark set");
  }
}
