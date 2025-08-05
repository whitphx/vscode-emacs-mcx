import * as vscode from "vscode";
import { Selection, TextEditor } from "vscode";
import type { EmacsCommand, InterruptEvent } from "./commands";
import { AddSelectionToNextFindMatch, AddSelectionToPreviousFindMatch } from "./commands/add-selection-to-find-match";
import * as CaseCommands from "./commands/case";
import { DeleteBlankLines } from "./commands/delete-blank-lines";
import * as EditCommands from "./commands/edit";
import * as TabCommands from "./commands/tab";
import * as IndentCommands from "./commands/indent";
import * as FindCommands from "./commands/find";
import * as KillCommands from "./commands/kill";
import * as MoveCommands from "./commands/move";
import * as NavigationCommands from "./commands/navigation";
import * as PareditCommands from "./commands/paredit";
import * as RectangleCommands from "./commands/rectangle";
import * as RegisterCommands from "./commands/registers";
import * as OtherWindowCommands from "./commands/other-window";
import { RecenterTopBottom } from "./commands/recenter";
import { EmacsCommandRegistry } from "./commands/registry";
import { KillYanker } from "./kill-yank";
import type { KillRing } from "./kill-yank/kill-ring";
import { Logger } from "./logger";
import { MessageManager } from "./message";
import { PrefixArgumentHandler } from "./prefix-argument";
import { Configuration } from "./configuration/configuration";
import { MarkRing } from "./mark-ring";
import { convertSelectionToRectSelections } from "./rectangle";
import type { Minibuffer } from "./minibuffer";
import { PromiseDelegate } from "./promise-delegate";
import { delay, type Unreliable } from "./utils";

const logger = Logger.get("EmacsEmulator");

export interface IEmacsController {
  readonly textEditor: TextEditor;

  runCommand(commandName: string): void | Thenable<unknown>;

  enterMarkMode(pushMark?: boolean): void;
  exitMarkMode(): void;
  pushMark(positions: vscode.Position[], replace?: boolean): void;

  readonly inRectMarkMode: boolean;
  readonly nativeSelections: readonly vscode.Selection[];
  moveRectActives: (navigateFn: (currentActives: vscode.Position, index: number) => vscode.Position) => void;
}

class NativeSelectionsStore {
  /**
   * `_nativeSelectionsMap[textEditor]` is usually synced to `textEditor.selections`.
   * Specially in rect-mark-mode, it is used to manage the underlying selections which the move commands directly manipulate
   * and the `textEditor.selections` is in turn managed to visually represent rects reflecting the underlying `_nativeSelectionsMap[textEditor]`.
   */
  private _nativeSelectionsMap: WeakMap<TextEditor, readonly vscode.Selection[]> = new WeakMap();
  private _nativeSelectionsSetPromiseMap: WeakMap<TextEditor, PromiseDelegate<void>> = new WeakMap();

  public get(textEditor: TextEditor): readonly vscode.Selection[] {
    const maybeNativeSelections = this._nativeSelectionsMap.get(textEditor);
    if (maybeNativeSelections) {
      return maybeNativeSelections;
    }

    const nativeSelections = textEditor.selections;
    this.set(textEditor, nativeSelections);
    return nativeSelections;
  }

  public set(textEditor: TextEditor, nativeSelections: readonly vscode.Selection[]): void {
    this._nativeSelectionsMap.set(textEditor, nativeSelections);

    const setPromise = this._nativeSelectionsSetPromiseMap.get(textEditor);
    if (setPromise) {
      setPromise.resolvePromise();
      this._nativeSelectionsSetPromiseMap.delete(textEditor);
    }
  }

  public waitSet(textEditor: TextEditor, timeout: number): Promise<void> {
    const setPromise = new PromiseDelegate<void>();
    this._nativeSelectionsSetPromiseMap.set(textEditor, setPromise);
    return Promise.any([setPromise.promise, delay(timeout)]);
  }
}

export class EmacsEmulator implements IEmacsController, vscode.Disposable {
  private _textEditor: TextEditor;
  public get textEditor(): TextEditor {
    return this._textEditor;
  }

  private commandRegistry: EmacsCommandRegistry;

  private markRing: MarkRing;
  private prevExchangedMarks: vscode.Position[] | null;

  private _isInMarkMode = false;
  public get isInMarkMode(): boolean {
    return this._isInMarkMode;
  }

  /**
   * EmacsEmulator is bound to a document,
   * and the anchor positions (=set mark positions) in mark mode
   * are shared among the TextEditor-s attached to the document.
   */
  private _markModeAnchors: vscode.Position[] = [];
  private get markModeAnchors(): vscode.Position[] {
    return this._markModeAnchors;
  }

  private rectMode = false;
  public get inRectMarkMode(): boolean {
    return this._isInMarkMode && this.rectMode;
  }

  private nativeSelectionsStore: NativeSelectionsStore = new NativeSelectionsStore();
  public get nativeSelections(): readonly vscode.Selection[] {
    return this.nativeSelectionsStore.get(this.textEditor);
  }
  private applyNativeSelectionsAsRect(): void {
    if (this.inRectMarkMode) {
      const rectSelections = this.nativeSelections.flatMap(
        convertSelectionToRectSelections.bind(null, this.textEditor.document),
      );
      this.textEditor.selections = rectSelections;
    }
  }
  public moveRectActives(navigateFn: (currentActive: vscode.Position, index: number) => vscode.Position): void {
    const newNativeSelections = this.nativeSelections.map((s, i) => {
      const newActive = navigateFn(s.active, i);
      return new vscode.Selection(s.anchor, newActive);
    });
    this.nativeSelectionsStore.set(this.textEditor, newNativeSelections);
    this.applyNativeSelectionsAsRect();
  }

  private killYanker: KillYanker;
  private prefixArgumentHandler: PrefixArgumentHandler;

  private disposables: vscode.Disposable[];

  constructor(
    textEditor: TextEditor,
    killRing: KillRing | null,
    minibuffer: Minibuffer,
    registers: RegisterCommands.Registers,
    rectangleState: RectangleCommands.RectangleState,
    registerCommandState: RegisterCommands.RegisterCommandState,
  ) {
    this._textEditor = textEditor;

    this.markRing = new MarkRing(Configuration.instance.markRingMax);
    this.prevExchangedMarks = null;

    this.prefixArgumentHandler = new PrefixArgumentHandler(
      this.onPrefixArgumentChange,
      this.onPrefixArgumentAcceptingStateChange,
    );

    this.disposables = [];

    vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument, this, this.disposables);
    vscode.window.onDidChangeTextEditorSelection(this.onDidChangeTextEditorSelection, this, this.disposables);
    vscode.window.onDidChangeTextEditorVisibleRanges(this.onDidChangeTextEditorVisibleRanges, this, this.disposables);

    const searchState: FindCommands.SearchState = {
      startSelections: undefined,
    };
    const killYanker = new KillYanker(this, killRing, minibuffer);
    this.killYanker = killYanker;
    this.registerDisposable(killYanker);

    this.commandRegistry = new EmacsCommandRegistry();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type EmacsCommandClass = { new (emulator: EmacsEmulator, ...args: any[]): EmacsCommand };
    const commandClasses: Array<[EmacsCommandClass, ...args: unknown[]]> = [
      [MoveCommands.ForwardChar],
      [MoveCommands.BackwardChar],
      [MoveCommands.NextLine],
      [MoveCommands.PreviousLine],
      [MoveCommands.MoveBeginningOfLine],
      [MoveCommands.MoveEndOfLine],
      [MoveCommands.ForwardWord],
      [MoveCommands.BackwardWord],
      [MoveCommands.BackToIndentation],
      [MoveCommands.BeginningOfBuffer],
      [MoveCommands.EndOfBuffer],
      [MoveCommands.ScrollUpCommand],
      [MoveCommands.ScrollDownCommand],
      [MoveCommands.ForwardParagraph],
      [MoveCommands.BackwardParagraph],
      [MoveCommands.MoveToWindowLineTopBottom],
      [EditCommands.DeleteBackwardChar],
      [EditCommands.DeleteForwardChar],
      [EditCommands.DeleteHorizontalSpace],
      [EditCommands.NewLine],
      [DeleteBlankLines],
      [RecenterTopBottom],
      [TabCommands.TabToTabStop],
      [IndentCommands.DeleteIndentation],
      [NavigationCommands.GotoLine, minibuffer],
      [NavigationCommands.FindDefinitions],
      [FindCommands.IsearchForward, searchState],
      [FindCommands.IsearchBackward, searchState],
      [FindCommands.IsearchForwardRegexp, searchState],
      [FindCommands.IsearchBackwardRegexp, searchState],
      [FindCommands.QueryReplace, searchState],
      [FindCommands.QueryReplaceRegexp, searchState],
      [FindCommands.IsearchAbort, searchState],
      [FindCommands.IsearchExit, searchState],
      [KillCommands.KillWord, killYanker],
      [KillCommands.BackwardKillWord, killYanker],
      [KillCommands.KillLine, killYanker],
      [KillCommands.KillWholeLine, killYanker],
      [KillCommands.KillRegion, killYanker],
      [KillCommands.CopyRegion, killYanker],
      [KillCommands.Yank, killYanker],
      [KillCommands.YankPop, killYanker],
      [KillCommands.BrowseKillRing, killYanker],
      [RegisterCommands.CopyToRegister, registerCommandState],
      [RegisterCommands.InsertRegister, registerCommandState],
      [RegisterCommands.CopyRectangleToRegister, registerCommandState],
      [RegisterCommands.PointToRegister, registerCommandState],
      [RegisterCommands.JumpToRegister, registerCommandState],
      [RegisterCommands.RegisterNameCommand, registers, registerCommandState],
      [RectangleCommands.StartAcceptingRectCommand],
      [RectangleCommands.KillRectangle, rectangleState],
      [RectangleCommands.CopyRectangleAsKill, rectangleState],
      [RectangleCommands.DeleteRectangle, rectangleState],
      [RectangleCommands.YankRectangle, rectangleState],
      [RectangleCommands.OpenRectangle],
      [RectangleCommands.ClearRectangle],
      [RectangleCommands.StringRectangle, minibuffer],
      [RectangleCommands.ReplaceKillRingToRectangle, killRing],
      [PareditCommands.ForwardSexp],
      [PareditCommands.BackwardSexp],
      [PareditCommands.ForwardDownSexp],
      [PareditCommands.BackwardUpSexp],
      [PareditCommands.MarkSexp],
      [PareditCommands.KillSexp, killYanker],
      [PareditCommands.BackwardKillSexp, killYanker],
      [PareditCommands.PareditKill, killYanker],
      [AddSelectionToNextFindMatch],
      [AddSelectionToPreviousFindMatch],
      [CaseCommands.TransformToUppercase],
      [CaseCommands.TransformToLowercase],
      [CaseCommands.TransformToTitlecase],
      [OtherWindowCommands.ScrollOtherWindow],
      [OtherWindowCommands.ScrollOtherWindowDown],
    ];
    for (const item of commandClasses) {
      const [CommandClass, ...args] = item;
      this.commandRegistry.register(new CommandClass(this, ...args));
    }
  }

  public setTextEditor(textEditor: TextEditor): void {
    this._textEditor = textEditor;
  }

  /**
   * This method is invoked from `onDidChangeActiveTextEditor`
   * to restore and synchronize the mark mode and the anchor positions
   * when the active text editor is switched.
   */
  public async switchTextEditor(textEditor: TextEditor): Promise<void> {
    this.setTextEditor(textEditor);

    // For example when the active text editor is switched by the code jump feature,
    // the selections are overridden by the code jump result AFTER `onDidChangeActiveTextEditor` is invoked
    // with some delay. So we need to wait for the selection change.
    // XXX: This delay time is ad-hoc.
    await this.nativeSelectionsStore.waitSet(textEditor, 100);

    this.nativeSelectionsStore.set(
      textEditor,
      this.isInMarkMode
        ? this.nativeSelections.map((selection, i) => {
            const anchor = this.markModeAnchors[i] ?? selection.anchor;
            return new vscode.Selection(anchor, selection.active);
          })
        : this.nativeSelections.map((selection) => {
            return new vscode.Selection(selection.active, selection.active);
          }),
    );
    if (this.rectMode) {
      this.applyNativeSelectionsAsRect();
    } else {
      this.textEditor.selections = this.nativeSelections;
    }

    if (this.rectMode) {
      // Pass
    } else {
      textEditor.options.cursorStyle = this.normalCursorStyle;
    }
  }

  public getTextEditor(): TextEditor {
    return this.textEditor;
  }

  public registerDisposable(disposable: vscode.Disposable): void {
    this.disposables.push(disposable);
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  public onDidChangeTextDocument = (e: vscode.TextDocumentChangeEvent): void => {
    // XXX: Is this a correct way to check the identity of document?
    if (e.document.uri.toString() === this.textEditor.document.uri.toString()) {
      if (
        e.contentChanges.some((contentChange) =>
          this.textEditor.selections.some((selection) => contentChange.range.intersection(selection) != null),
        )
      ) {
        this.exitMarkMode();
      }
      if (e.reason === vscode.TextDocumentChangeReason.Undo || e.reason === vscode.TextDocumentChangeReason.Redo) {
        this.exitMarkMode();
      }

      this.onDidInterruptTextEditor({ reason: "document-changed", originalEvent: e });
    }
  };

  public onDidChangeTextEditorSelection = (e: vscode.TextEditorSelectionChangeEvent): void => {
    if (e.textEditor !== this.textEditor) {
      return;
    }

    if (!this.rectMode) {
      this.nativeSelectionsStore.set(e.textEditor, e.textEditor.selections);
    }
    this.onDidInterruptTextEditor({ reason: "selection-changed", originalEvent: e });
  };

  public onDidChangeTextEditorVisibleRanges = (e: vscode.TextEditorVisibleRangesChangeEvent) => {
    if (e.textEditor !== this.textEditor) {
      return;
    }
    if (Configuration.instance.keepCursorInVisibleRange) {
      if (this.hasMultipleSelections()) {
        // This feature messes up the multi-cursors so disable it.
        // Ref: https://github.com/whitphx/vscode-emacs-mcx/issues/2126
        return;
      }
      // Keep the primary cursor in the visible range when scrolling
      MoveCommands.movePrimaryCursorIntoVisibleRange(this.textEditor, this.isInMarkMode, this);
    }
  };

  /**
   * An extended version of the native `type` command with prefix argument integration.
   */
  public async typeChar(char: string): Promise<unknown> {
    if (this.isInMarkMode) {
      this.exitMarkMode();
    }

    if (char === "-" && this.prefixArgumentHandler.minusSignAcceptable) {
      return this.prefixArgumentHandler.negativeArgument();
    }

    const prefixArgument = this.prefixArgumentHandler.getPrefixArgument();
    await this.prefixArgumentHandler.cancel();

    const repeat = prefixArgument == null ? 1 : prefixArgument;
    if (repeat < 0) {
      MessageManager.showMessage(`Negative repetition argument ${repeat}`);
      return;
    }

    if (repeat === 1) {
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
  public async type(text: string): Promise<unknown> {
    // Single character input with prefix argument
    // NOTE: This single character handling should be replaced with `EmacsEmulator.typeChar` directly bound to relevant keystrokes,
    // however, it's difficult to cover all characters without `type` event registration,
    // then this method can be used to handle single character inputs other than ASCII characters,
    // for those who want it as an option.
    const prefixArgument = this.prefixArgumentHandler.getPrefixArgument();
    await this.prefixArgumentHandler.cancel();

    logger.debug(`[type]\t Single char (text: "${text}", prefix argument: ${prefixArgument}).`);
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

    logger.debug(`[type]\t Execute "default:type" (text: "${text}")`);
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

  public onPrefixArgumentChange = (newPrefixArgument: number | undefined): Thenable<unknown> => {
    logger.debug(`[onPrefixArgumentChange]\t Prefix argument: ${newPrefixArgument}`);

    return Promise.all([
      vscode.commands.executeCommand("setContext", "emacs-mcx.prefixArgument", newPrefixArgument),
      vscode.commands.executeCommand("setContext", "emacs-mcx.prefixArgumentExists", newPrefixArgument != null),
    ]);
  };

  public onPrefixArgumentAcceptingStateChange = (newState: boolean): Thenable<unknown> => {
    logger.debug(`[onPrefixArgumentAcceptingStateChange]\t Prefix accepting: ${newState}`);
    return vscode.commands.executeCommand("setContext", "emacs-mcx.acceptingArgument", newState);
  };

  public runCommand(commandName: string, args?: unknown): Thenable<unknown> | void {
    const command = this.commandRegistry.get(commandName);

    if (command === undefined) {
      throw Error(`command ${commandName} is not found`);
    }

    const prefixArgument = this.prefixArgumentHandler.getPrefixArgument();

    return Promise.all([
      command.isIntermediateCommand ? null : this.prefixArgumentHandler.cancel(),
      command.run(this.textEditor, this.isInMarkMode, prefixArgument, args),
    ]).then(([, result]) => result);
  }

  /**
   * C-<SPC>
   */
  public async setMarkCommand(): Promise<void> {
    if (this.prefixArgumentHandler.precedingSingleCtrlU()) {
      // C-u C-<SPC>
      this.popMark();
      await this.prefixArgumentHandler.cancel();
      return;
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
    this.textEditor.selections = this.nativeSelections;

    if (!this.isInMarkMode) {
      this.makeSelectionsEmpty();
    }

    this.textEditor.options.cursorStyle = this.normalCursorStyle;
  }

  /**
   * Invoked by C-g
   */
  public async cancel(): Promise<void> {
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

    this.onDidInterruptTextEditor({ reason: "user-cancel" });

    this.killYanker.cancelKillAppend();

    MessageManager.showMessage("Quit");

    await this.prefixArgumentHandler.cancel();
  }

  public enterMarkMode(pushMark = true): void {
    this._isInMarkMode = true;
    this._markModeAnchors = this.textEditor.selections.map((selection) => selection.anchor);
    this.rectMode = false;

    // At this moment, the only way to set the context for `when` conditions is `setContext` command.
    // The discussion is ongoing in https://github.com/Microsoft/vscode/issues/10471
    // TODO: How to write unittest for `setContext`?
    vscode.commands.executeCommand("setContext", "emacs-mcx.inMarkMode", true);

    if (pushMark) {
      this.pushMark(this.textEditor.selections.map((selection) => selection.active));
      this.textEditor.selections = this.textEditor.selections.map(
        (selection) => new Selection(selection.active, selection.active),
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
        // `i < affectedLen <= prevMarks.length`,
        // so the `noUncheckedIndexedAccess` rule can be skipped here.

        const prevMark = prevMarks[i]!;
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

  public executeCommandWithPrefixArgument<T = unknown>(
    command: string,
    args: Unreliable<unknown> = undefined,
    prefixArgumentKey = "prefixArgument",
  ): Thenable<T> {
    const prefixArgument = this.prefixArgumentHandler.getPrefixArgument();

    return Promise.all([
      this.prefixArgumentHandler.cancel(),
      vscode.commands.executeCommand<T>(command, { ...args, [prefixArgumentKey]: prefixArgument }),
    ]).then(([, result]) => result);
  }

  public getPrefixArgument(): number | undefined {
    return this.prefixArgumentHandler.getPrefixArgument();
  }

  private makeSelectionsEmpty() {
    const srcSelections = this.rectMode ? this.nativeSelections : this.textEditor.selections;
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

  public onDidInterruptTextEditor(event: InterruptEvent) {
    this.commandRegistry.onInterrupt(event);
  }
}
