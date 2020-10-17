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

export interface IEmacsCommandRunner {
  runCommand(commandName: string): void | Thenable<unknown>;
}

export interface IMarkModeController {
  enterMarkMode(): void;
  exitMarkMode(): void;
}

export class EmacsEmulator implements IEmacsCommandRunner, IMarkModeController {
  private textEditor: TextEditor;

  private commandRegistry: EmacsCommandRegistry;

  public markRing: MarkRing;
  private prevExchangedMarks: vscode.Position[] | null;

  // tslint:disable-next-line:variable-name
  private _isInMarkMode = false;
  public get isInMarkMode() {
    return this._isInMarkMode;
  }

  private killYanker: KillYanker;
  private prefixArgumentHandler: PrefixArgumentHandler;

  constructor(textEditor: TextEditor, killRing: KillRing | null = null) {
    this.textEditor = textEditor;

    this.markRing = new MarkRing(Configuration.instance.markRingMax);
    this.prevExchangedMarks = null;

    this.prefixArgumentHandler = new PrefixArgumentHandler(
      this.onPrefixArgumentChange,
      this.onPrefixArgumentAcceptingStateChange
    );

    this.onDidChangeTextDocument = this.onDidChangeTextDocument.bind(this);
    vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument);
    this.onDidChangeTextEditorSelection = this.onDidChangeTextEditorSelection.bind(this);
    vscode.window.onDidChangeTextEditorSelection(this.onDidChangeTextEditorSelection);

    this.commandRegistry = new EmacsCommandRegistry();
    this.afterCommand = this.afterCommand.bind(this);

    this.commandRegistry.register(new MoveCommands.ForwardChar(this.afterCommand, this));
    this.commandRegistry.register(new MoveCommands.BackwardChar(this.afterCommand, this));
    this.commandRegistry.register(new MoveCommands.NextLine(this.afterCommand, this));
    this.commandRegistry.register(new MoveCommands.PreviousLine(this.afterCommand, this));
    this.commandRegistry.register(new MoveCommands.MoveBeginningOfLine(this.afterCommand, this));
    this.commandRegistry.register(new MoveCommands.MoveEndOfLine(this.afterCommand, this));
    this.commandRegistry.register(new MoveCommands.ForwardWord(this.afterCommand, this));
    this.commandRegistry.register(new MoveCommands.BackwardWord(this.afterCommand, this));
    this.commandRegistry.register(new MoveCommands.BackToIndentation(this.afterCommand, this));
    this.commandRegistry.register(new MoveCommands.BeginningOfBuffer(this.afterCommand, this));
    this.commandRegistry.register(new MoveCommands.EndOfBuffer(this.afterCommand, this));
    this.commandRegistry.register(new MoveCommands.ScrollUpCommand(this.afterCommand, this));
    this.commandRegistry.register(new MoveCommands.ScrollDownCommand(this.afterCommand, this));
    this.commandRegistry.register(new MoveCommands.ForwardParagraph(this.afterCommand, this));
    this.commandRegistry.register(new MoveCommands.BackwardParagraph(this.afterCommand, this));
    this.commandRegistry.register(new EditCommands.DeleteBackwardChar(this.afterCommand, this));
    this.commandRegistry.register(new EditCommands.DeleteForwardChar(this.afterCommand, this));
    this.commandRegistry.register(new EditCommands.NewLine(this.afterCommand, this));
    this.commandRegistry.register(new FindCommands.IsearchForward(this.afterCommand, this));
    this.commandRegistry.register(new FindCommands.IsearchBackward(this.afterCommand, this));
    this.commandRegistry.register(new DeleteBlankLines(this.afterCommand, this));

    this.commandRegistry.register(new RecenterTopBottom(this.afterCommand, this));

    const killYanker = new KillYanker(textEditor, killRing);
    this.commandRegistry.register(new KillCommands.KillWord(this.afterCommand, this, killYanker));
    this.commandRegistry.register(new KillCommands.BackwardKillWord(this.afterCommand, this, killYanker));
    this.commandRegistry.register(new KillCommands.KillLine(this.afterCommand, this, killYanker));
    this.commandRegistry.register(new KillCommands.KillWholeLine(this.afterCommand, this, killYanker));
    this.commandRegistry.register(new KillCommands.KillRegion(this.afterCommand, this, killYanker));
    this.commandRegistry.register(new KillCommands.CopyRegion(this.afterCommand, this, killYanker));
    this.commandRegistry.register(new KillCommands.Yank(this.afterCommand, this, killYanker));
    this.commandRegistry.register(new KillCommands.YankPop(this.afterCommand, this, killYanker));
    this.killYanker = killYanker; // TODO: To be removed

    this.commandRegistry.register(new PareditCommands.ForwardSexp(this.afterCommand, this));
    this.commandRegistry.register(new PareditCommands.BackwardSexp(this.afterCommand, this));
    this.commandRegistry.register(new PareditCommands.ForwardDownSexp(this.afterCommand, this));
    this.commandRegistry.register(new PareditCommands.BackwardUpSexp(this.afterCommand, this));
    this.commandRegistry.register(new PareditCommands.KillSexp(this.afterCommand, this, killYanker));

    this.commandRegistry.register(new AddSelectionToNextFindMatch(this.afterCommand, this));
    this.commandRegistry.register(new AddSelectionToPreviousFindMatch(this.afterCommand, this));

    this.commandRegistry.register(new CaseCommands.TransformToUppercase(this.afterCommand, this));
    this.commandRegistry.register(new CaseCommands.TransformToLowercase(this.afterCommand, this));
    this.commandRegistry.register(new CaseCommands.TransformToTitlecase(this.afterCommand, this));
  }

  public setTextEditor(textEditor: TextEditor) {
    this.textEditor = textEditor;
    this.killYanker.setTextEditor(textEditor);
  }

  public getTextEditor(): TextEditor {
    return this.textEditor;
  }

  public onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent) {
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

  public onDidChangeTextEditorSelection(e: vscode.TextEditorSelectionChangeEvent) {
    if (new EditorIdentity(e.textEditor).isEqual(new EditorIdentity(this.textEditor))) {
      this.onDidInterruptTextEditor();
    }
  }

  public typeChar(char: string) {
    const prefixArgument = this.prefixArgumentHandler.getPrefixArgument();
    this.prefixArgumentHandler.cancel();

    const repeat = prefixArgument == null ? 1 : prefixArgument;
    if (repeat < 0) {
      return;
    }

    return this.textEditor.edit((editBuilder) => {
      this.textEditor.selections.forEach((selection) => {
        editBuilder.insert(selection.active, char.repeat(repeat));
      });
    });
  }

  // Ref: https://github.com/Microsoft/vscode-extension-samples/blob/f9955406b4cad550fdfa891df23a84a2b344c3d8/vim-sample/src/extension.ts#L152
  public type(text: string) {
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
   * digits following C-u
   */
  public universalArgumentDigit(arg: number): Promise<unknown> {
    return this.prefixArgumentHandler.universalArgumentDigit(arg);
  }

  public onPrefixArgumentChange(newPrefixArgument: number | undefined): Thenable<unknown> {
    logger.debug(`[EmacsEmulator.onPrefixArgumentChange]\t Prefix argument: ${newPrefixArgument}`);

    return vscode.commands.executeCommand("setContext", "emacs-mcx.prefixArgument", newPrefixArgument);
  }

  public onPrefixArgumentAcceptingStateChange(newState: boolean): Thenable<unknown> {
    logger.debug(`[EmacsEmulator.onPrefixArgumentAcceptingStateChange]\t Prefix accepting: ${newState}`);
    return vscode.commands.executeCommand("setContext", "emacs-mcx.acceptingArgument", newState);
  }

  public runCommand(commandName: string) {
    const command = this.commandRegistry.get(commandName);

    if (command === undefined) {
      throw Error(`command ${commandName} is not found`);
    }

    const prefixArgument = this.prefixArgumentHandler.getPrefixArgument();

    return command.run(this.textEditor, this.isInMarkMode, prefixArgument);
  }

  /**
   * C-<SPC>
   */
  public setMarkCommand() {
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
   * Invoked by C-g
   */
  public cancel() {
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

  public enterMarkMode(pushMark = true) {
    this._isInMarkMode = true;

    // At this moment, the only way to set the context for `when` conditions is `setContext` command.
    // The discussion is ongoing in https://github.com/Microsoft/vscode/issues/10471
    // TODO: How to write unittest for `setContext`?
    vscode.commands.executeCommand("setContext", "emacs-mcx.inMarkMode", true);

    if (pushMark) {
      this.pushMark();
    }
  }

  public pushMark() {
    this.prevExchangedMarks = null;
    this.markRing.push(this.textEditor.selections.map((selection) => selection.active));
  }

  public popMark() {
    const prevMark = this.markRing.pop();
    if (prevMark) {
      this.textEditor.selections = prevMark.map((position) => new Selection(position, position));
    }
  }

  public exchangePointAndMark() {
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

  public exitMarkMode() {
    this._isInMarkMode = false;
    vscode.commands.executeCommand("setContext", "emacs-mcx.inMarkMode", false);
  }

  private makeSelectionsEmpty() {
    this.textEditor.selections = this.textEditor.selections.map(
      (selection) => new Selection(selection.active, selection.active)
    );
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
        command.onDidInterruptTextEditor();
      }
    });
  }
}
