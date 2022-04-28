import * as vscode from "vscode";
import { Selection, TextEditor } from "vscode";
import { instanceOfIEmacsCommandInterrupted } from "./commands";
import { AddSelectionToNextFindMatch, AddSelectionToPreviousFindMatch } from "./commands/add-selection-to-find-match";
import * as CaseCommands from "./commands/case";
import { DeleteBlankLines } from "./commands/delete-blank-lines";
import * as EditCommands from "./commands/edit";
import * as FindCommands from "./commands/find";
import * as KillCommands from "./commands/kill";
import * as MoveCommands from "./commands/move";
import * as PareditCommands from "./commands/paredit";
import * as RectangleCommands from "./commands/rectangle";
import { RecenterTopBottom } from "./commands/recenter";
import { EmacsCommandRegistry } from "./commands/registry";
import { EditorIdentity } from "./editorIdentity";
import { KillYanker } from "./kill-yank";
import { KillRing } from "./kill-yank/kill-ring";
import { logger } from "./logger";
import { MessageManager } from "./message";
import { PrefixArgumentHandler } from "./prefix-argument";
import { Configuration } from "./configuration/configuration";
import { MarkRing } from "./mark-ring";
import { convertSelectionToRectSelections } from "./rectangle";
import { InputBoxMinibuffer, Minibuffer } from "./minibuffer";

export interface IEmacsController {
  runCommand(commandName: string): void | Thenable<unknown>;

  enterMarkMode(pushMark?: boolean): void;
  exitMarkMode(): void;
  pushMark(positions: vscode.Position[], replace?: boolean): void;

  readonly inRectMarkMode: boolean;
  readonly nativeSelections: vscode.Selection[];
  moveRectActives: (navigateFn: (currentActives: vscode.Position[]) => vscode.Position[]) => void;
}

export class EmacsEmulator implements IEmacsController, vscode.Disposable {
  private textEditor: TextEditor;

  private commandRegistry: EmacsCommandRegistry;

  private markRing: MarkRing;
  private prevExchangedMarks: vscode.Position[] | null;

  private _isInMarkMode = false;
  public get isInMarkMode(): boolean {
    return this._isInMarkMode;
  }

  private rectMode = false;
  public get inRectMarkMode(): boolean {
    return this._isInMarkMode && this.rectMode;
  }

  /**
   * It is usually synced to `textEditor.selections`.
   * Specially in rect-mark-mode, it is used to manage the underlying selections which the move commands directly manipulate
   * and the `textEditor.selections` is in turn managed to visually represent rects reflecting the underlying `this._nativeSelections`.
   */
  private _nativeSelections: vscode.Selection[];
  public get nativeSelections(): vscode.Selection[] {
    return this._nativeSelections;
  }
  private applyNativeSelectionsAsRect(): void {
    if (this.inRectMarkMode) {
      const rectSelections = this._nativeSelections
        .map(convertSelectionToRectSelections.bind(null, this.textEditor.document))
        .reduce((a, b) => a.concat(b), []);
      this.textEditor.selections = rectSelections;
    }
  }
  public moveRectActives(navigateFn: (currentActives: vscode.Position[]) => vscode.Position[]): void {
    const newActives = navigateFn(this._nativeSelections.map((s) => s.active));
    const newNativeSelections = this._nativeSelections.map((s, i) => new vscode.Selection(s.anchor, newActives[i]));
    this._nativeSelections = newNativeSelections;
    this.applyNativeSelectionsAsRect();
  }

  private killYanker: KillYanker;
  private prefixArgumentHandler: PrefixArgumentHandler;

  private disposables: vscode.Disposable[];

  constructor(
    textEditor: TextEditor,
    killRing: KillRing | null = null,
    minibuffer: Minibuffer = new InputBoxMinibuffer()
  ) {
    this.textEditor = textEditor;
    this._nativeSelections = this.rectMode ? [] : textEditor.selections; // TODO: `[]` is workaround.

    this.markRing = new MarkRing(Configuration.instance.markRingMax);
    this.prevExchangedMarks = null;

    this.prefixArgumentHandler = new PrefixArgumentHandler(
      this.onPrefixArgumentChange,
      this.onPrefixArgumentAcceptingStateChange
    );

    this.disposables = [];

    vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument, this, this.disposables);
    vscode.window.onDidChangeTextEditorSelection(this.onDidChangeTextEditorSelection, this, this.disposables);

    this.commandRegistry = new EmacsCommandRegistry();
    this.afterCommand = this.afterCommand.bind(this);

    this.commandRegistry.register(new MoveCommands.ForwardChar(this));
    this.commandRegistry.register(new MoveCommands.BackwardChar(this));
    this.commandRegistry.register(new MoveCommands.NextLine(this));
    this.commandRegistry.register(new MoveCommands.PreviousLine(this));
    this.commandRegistry.register(new MoveCommands.MoveBeginningOfLine(this));
    this.commandRegistry.register(new MoveCommands.MoveEndOfLine(this));
    this.commandRegistry.register(new MoveCommands.ForwardWord(this));
    this.commandRegistry.register(new MoveCommands.BackwardWord(this));
    this.commandRegistry.register(new MoveCommands.BackToIndentation(this));
    this.commandRegistry.register(new MoveCommands.BeginningOfBuffer(this));
    this.commandRegistry.register(new MoveCommands.EndOfBuffer(this));
    this.commandRegistry.register(new MoveCommands.ScrollUpCommand(this));
    this.commandRegistry.register(new MoveCommands.ScrollDownCommand(this));
    this.commandRegistry.register(new MoveCommands.ForwardParagraph(this));
    this.commandRegistry.register(new MoveCommands.BackwardParagraph(this));
    this.commandRegistry.register(new EditCommands.DeleteBackwardChar(this));
    this.commandRegistry.register(new EditCommands.DeleteForwardChar(this));
    this.commandRegistry.register(new EditCommands.NewLine(this));
    this.commandRegistry.register(new DeleteBlankLines(this));
    this.commandRegistry.register(new RecenterTopBottom(this));

    const searchState: FindCommands.SearchState = {
      startSelections: undefined,
    };
    this.commandRegistry.register(new FindCommands.IsearchForward(this, searchState));
    this.commandRegistry.register(new FindCommands.IsearchBackward(this, searchState));
    this.commandRegistry.register(new FindCommands.IsearchForwardRegexp(this, searchState));
    this.commandRegistry.register(new FindCommands.IsearchBackwardRegexp(this, searchState));
    this.commandRegistry.register(new FindCommands.QueryReplace(this, searchState));
    this.commandRegistry.register(new FindCommands.QueryReplaceRegexp(this, searchState));
    this.commandRegistry.register(new FindCommands.IsearchAbort(this, searchState));
    this.commandRegistry.register(new FindCommands.IsearchExit(this, searchState));

    const killYanker = new KillYanker(textEditor, killRing, minibuffer);
    this.commandRegistry.register(new KillCommands.KillWord(this, killYanker));
    this.commandRegistry.register(new KillCommands.BackwardKillWord(this, killYanker));
    this.commandRegistry.register(new KillCommands.KillLine(this, killYanker));
    this.commandRegistry.register(new KillCommands.KillWholeLine(this, killYanker));
    this.commandRegistry.register(new KillCommands.KillRegion(this, killYanker));
    this.commandRegistry.register(new KillCommands.CopyRegion(this, killYanker));
    this.commandRegistry.register(new KillCommands.Yank(this, killYanker));
    this.commandRegistry.register(new KillCommands.YankPop(this, killYanker));
    this.killYanker = killYanker; // TODO: To be removed
    this.disposables.push(killYanker);

    const rectangleState: RectangleCommands.RectangleState = {
      latestKilledRectangle: [],
    };
    this.commandRegistry.register(new RectangleCommands.StartAcceptingRectCommand(this));
    this.commandRegistry.register(new RectangleCommands.KillRectangle(this, rectangleState));
    this.commandRegistry.register(new RectangleCommands.CopyRectangleAsKill(this, rectangleState));
    this.commandRegistry.register(new RectangleCommands.DeleteRectangle(this, rectangleState));
    this.commandRegistry.register(new RectangleCommands.YankRectangle(this, rectangleState));
    this.commandRegistry.register(new RectangleCommands.OpenRectangle(this));
    this.commandRegistry.register(new RectangleCommands.ClearRectangle(this));
    this.commandRegistry.register(new RectangleCommands.StringRectangle(this, minibuffer));
    this.commandRegistry.register(new RectangleCommands.ReplaceKillRingToRectangle(this, killRing));

    this.commandRegistry.register(new PareditCommands.ForwardSexp(this));
    this.commandRegistry.register(new PareditCommands.BackwardSexp(this));
    this.commandRegistry.register(new PareditCommands.ForwardDownSexp(this));
    this.commandRegistry.register(new PareditCommands.BackwardUpSexp(this));
    this.commandRegistry.register(new PareditCommands.MarkSexp(this));
    this.commandRegistry.register(new PareditCommands.KillSexp(this, killYanker));
    this.commandRegistry.register(new PareditCommands.BackwardKillSexp(this, killYanker));

    this.commandRegistry.register(new AddSelectionToNextFindMatch(this));
    this.commandRegistry.register(new AddSelectionToPreviousFindMatch(this));

    this.commandRegistry.register(new CaseCommands.TransformToUppercase(this));
    this.commandRegistry.register(new CaseCommands.TransformToLowercase(this));
    this.commandRegistry.register(new CaseCommands.TransformToTitlecase(this));
  }

  public setTextEditor(textEditor: TextEditor): void {
    this.textEditor = textEditor;
    this.killYanker.setTextEditor(textEditor);
  }

  public getTextEditor(): TextEditor {
    return this.textEditor;
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  public onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent): void {
    // XXX: Is this a correct way to check the identity of document?
    if (e.document.uri.toString() === this.textEditor.document.uri.toString()) {
      if (
        e.contentChanges.some((contentChange) =>
          this.textEditor.selections.some(
            (selection) => typeof contentChange.range.intersection(selection) !== "undefined"
          )
        )
      ) {
        this.exitMarkMode();
      }

      this.onDidInterruptTextEditor();
    }
  }

  public onDidChangeTextEditorSelection(e: vscode.TextEditorSelectionChangeEvent): void {
    if (new EditorIdentity(e.textEditor).isEqual(new EditorIdentity(this.textEditor))) {
      this.onDidInterruptTextEditor();

      if (!this.rectMode) {
        this._nativeSelections = this.textEditor.selections;
      }
    }
  }

  /**
   * An extended version of the native `type` command with prefix argument integration.
   */
  public typeChar(char: string): void | Thenable<unknown> {
    if (this.isInMarkMode) {
      this.exitMarkMode();
    }

    if (char === "-" && this.prefixArgumentHandler.minusSignAcceptable) {
      return this.prefixArgumentHandler.negativeArgument();
    }

    const prefixArgument = this.prefixArgumentHandler.getPrefixArgument();
    this.prefixArgumentHandler.cancel();

    const repeat = prefixArgument == null ? 1 : prefixArgument;
    if (repeat < 0) {
      MessageManager.showMessage(`Negative repetition argument ${repeat}`);
      return;
    }

    if (repeat == 1) {
      // It's better to use `type` command than `TextEditor.edit` method
      // because `type` command invokes features like auto-completion reacting to character inputs.
      return vscode.commands.executeCommand("type", { text: char });
    }

    return this.textEditor.edit((editBuilder) => {
      this.textEditor.selections.forEach((selection) => {
        editBuilder.insert(selection.active, char.repeat(repeat));
      });
    });
  }

  // Ref: https://github.com/Microsoft/vscode-extension-samples/blob/f9955406b4cad550fdfa891df23a84a2b344c3d8/vim-sample/src/extension.ts#L152
  public type(text: string): Thenable<unknown> {
    // Single character input with prefix argument
    // NOTE: This single character handling should be replaced with `EmacsEmulator.typeChar` directly bound to relevant keystrokes,
    // however, it's difficult to cover all characters without `type` event registration,
    // then this method can be used to handle single character inputs other than ASCII characters,
    // for those who want it as an option.
    const prefixArgument = this.prefixArgumentHandler.getPrefixArgument();
    this.prefixArgumentHandler.cancel();

    logger.debug(`[EmacsEmulator.type]\t Single char (text: "${text}", prefix argument: ${prefixArgument}).`);
    if (prefixArgument !== undefined && prefixArgument >= 0) {
      const promises = [];
      for (let i = 0; i < prefixArgument; ++i) {
        const promise = vscode.commands.executeCommand("default:type", {
          text,
        });
        promises.push(promise);
      }
      // NOTE: Current implementation executes promises concurrently. Should it be sequential?
      return Promise.all(promises);
    }

    logger.debug(`[EmacsEmulator.type]\t Execute "default:type" (text: "${text}")`);
    return vscode.commands.executeCommand("default:type", {
      text,
    });
  }

  /**
   * C-u
   */
  public universalArgument(): Promise<unknown> {
    return this.prefixArgumentHandler.universalArgument();
  }

  /**
   * M-<number>
   */
  public digitArgument(digit: number): Promise<unknown> {
    return this.prefixArgumentHandler.digitArgument(digit);
  }

  /**
   * M--
   */
  public negativeArgument(): Promise<unknown> {
    return this.prefixArgumentHandler.negativeArgument();
  }

  /**
   * Digits following C-u or M-<number>
   */
  public subsequentArgumentDigit(arg: number): Promise<unknown> {
    return this.prefixArgumentHandler.subsequentArgumentDigit(arg);
  }

  public onPrefixArgumentChange(newPrefixArgument: number | undefined): Thenable<unknown> {
    logger.debug(`[EmacsEmulator.onPrefixArgumentChange]\t Prefix argument: ${newPrefixArgument}`);

    return Promise.all([
      vscode.commands.executeCommand("setContext", "emacs-mcx.prefixArgument", newPrefixArgument),
      vscode.commands.executeCommand("setContext", "emacs-mcx.prefixArgumentExists", newPrefixArgument != null),
    ]);
  }

  public onPrefixArgumentAcceptingStateChange(newState: boolean): Thenable<unknown> {
    logger.debug(`[EmacsEmulator.onPrefixArgumentAcceptingStateChange]\t Prefix accepting: ${newState}`);
    return vscode.commands.executeCommand("setContext", "emacs-mcx.acceptingArgument", newState);
  }

  public runCommand(commandName: string): Thenable<unknown> | void {
    const command = this.commandRegistry.get(commandName);

    if (command === undefined) {
      throw Error(`command ${commandName} is not found`);
    }

    const prefixArgument = this.prefixArgumentHandler.getPrefixArgument();

    const ret = command.run(this.textEditor, this.isInMarkMode, prefixArgument);
    this.afterCommand();
    return ret;
  }

  /**
   * C-<SPC>
   */
  public setMarkCommand(): void {
    if (this.prefixArgumentHandler.precedingSingleCtrlU()) {
      // C-u C-<SPC>
      this.prefixArgumentHandler.cancel();
      return this.popMark();
    }

    if (this.isInMarkMode && !this.hasNonEmptySelection()) {
      // Toggle if enterMarkMode is invoked continuously without any cursor move.
      this.exitMarkMode();
      MessageManager.showMessage("Mark deactivated");
    } else {
      this.enterMarkMode();
      MessageManager.showMessage("Mark activated");
    }
  }

  /**
   * C-x <SPC>
   */
  public rectangleMarkMode(): void {
    if (this.inRectMarkMode) {
      this.exitRectangleMarkMode();
    } else {
      this.enterRectangleMarkMode();
    }
  }

  private normalCursorStyle?: vscode.TextEditorCursorStyle = undefined;
  private enterRectangleMarkMode(): void {
    if (this.isInMarkMode) {
      MessageManager.showMessage("Rectangle-Mark mode enabled in current buffer");
    } else {
      MessageManager.showMessage("Mark set (rectangle-mode)");
    }

    this.enterMarkMode();
    this.rectMode = true;
    vscode.commands.executeCommand("setContext", "emacs-mcx.inRectMarkMode", true);
    this.applyNativeSelectionsAsRect();

    this.normalCursorStyle = this.textEditor.options.cursorStyle;
    this.textEditor.options.cursorStyle = vscode.TextEditorCursorStyle.LineThin;
  }

  private exitRectangleMarkMode(): void {
    if (!this.rectMode) {
      return;
    }

    this.rectMode = false;
    vscode.commands.executeCommand("setContext", "emacs-mcx.inRectMarkMode", false);
    this.textEditor.selections = this._nativeSelections;

    if (!this.isInMarkMode) {
      this.makeSelectionsEmpty();
    }

    this.textEditor.options.cursorStyle = this.normalCursorStyle;
  }

  /**
   * Invoked by C-g
   */
  public cancel(): void {
    if (this.rectMode) {
      this.exitRectangleMarkMode();
    }

    if (this.hasMultipleSelections() && !this.hasNonEmptySelection()) {
      this.stopMultiCursor();
    } else {
      this.makeSelectionsEmpty();
    }

    if (this.isInMarkMode) {
      this.exitMarkMode();
    }

    this.onDidInterruptTextEditor();

    this.killYanker.cancelKillAppend();
    this.prefixArgumentHandler.cancel();

    MessageManager.showMessage("Quit");
  }

  public enterMarkMode(pushMark = true): void {
    this._isInMarkMode = true;
    this.rectMode = false;

    // At this moment, the only way to set the context for `when` conditions is `setContext` command.
    // The discussion is ongoing in https://github.com/Microsoft/vscode/issues/10471
    // TODO: How to write unittest for `setContext`?
    vscode.commands.executeCommand("setContext", "emacs-mcx.inMarkMode", true);

    if (pushMark) {
      this.pushMark(this.textEditor.selections.map((selection) => selection.active));
      this.textEditor.selections = this.textEditor.selections.map(
        (selection) => new Selection(selection.active, selection.active)
      );
    }
  }

  public pushMark(positions: vscode.Position[], replace = false): void {
    this.prevExchangedMarks = null;
    this.markRing.push(positions, replace);
  }

  public popMark(): void {
    const prevMark = this.markRing.pop();
    if (prevMark) {
      this.textEditor.selections = prevMark.map((position) => new Selection(position, position));
      this.textEditor.revealRange(this.textEditor.selection);
    }
  }

  public exchangePointAndMark(): void {
    const prevMarks = this.prevExchangedMarks || this.markRing.getTop();
    this.enterMarkMode(false);
    this.prevExchangedMarks = this.textEditor.selections.map((selection) => selection.active);

    if (prevMarks) {
      const affectedLen = Math.min(this.textEditor.selections.length, prevMarks.length);
      const affectedSelections = this.textEditor.selections.slice(0, affectedLen).map((selection, i) => {
        const prevMark = prevMarks[i];
        return new vscode.Selection(selection.active, prevMark);
      });
      const newSelections = affectedSelections.concat(this.textEditor.selections.slice(affectedLen));
      this.textEditor.selections = newSelections;
      this.textEditor.revealRange(this.textEditor.selection);
    }
  }

  public exitMarkMode(): void {
    this._isInMarkMode = false;
    this.exitRectangleMarkMode();
    vscode.commands.executeCommand("setContext", "emacs-mcx.inMarkMode", false);
  }

  public executeCommandWithPrefixArgument<T>(
    command: string,
    args: any = null,
    prefixArgumentKey = "prefixArgument"
  ): Thenable<T | undefined> {
    const prefixArgument = this.prefixArgumentHandler.getPrefixArgument();
    this.prefixArgumentHandler.cancel();

    return vscode.commands.executeCommand<T>(command, { ...args, [prefixArgumentKey]: prefixArgument });
  }

  public getPrefixArgument(): number | undefined {
    return this.prefixArgumentHandler.getPrefixArgument();
  }

  private makeSelectionsEmpty() {
    const srcSelections = this.rectMode ? this._nativeSelections : this.textEditor.selections;
    this.textEditor.selections = srcSelections.map((selection) => new Selection(selection.active, selection.active));
  }

  private stopMultiCursor() {
    vscode.commands.executeCommand("removeSecondaryCursors");
  }

  private hasMultipleSelections(): boolean {
    return this.textEditor.selections.length > 1;
  }

  private hasNonEmptySelection(): boolean {
    return this.textEditor.selections.some((selection) => !selection.isEmpty);
  }

  private afterCommand() {
    return this.prefixArgumentHandler.cancel();
  }

  private onDidInterruptTextEditor() {
    this.commandRegistry.forEach((command) => {
      if (instanceOfIEmacsCommandInterrupted(command)) {
        // TODO: Cache the array of IEmacsCommandInterrupted instances
        command.onDidInterruptTextEditor();
      }
    });
  }
}
