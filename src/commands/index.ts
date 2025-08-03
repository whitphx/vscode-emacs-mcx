import { TextEditor } from "vscode";
import type { TextEditorSelectionChangeEvent, TextDocumentChangeEvent } from "vscode";
import type { IEmacsController } from "../emulator";

export function makeParallel<T>(concurrency: number, promiseFactory: () => Thenable<T>): Thenable<T[]> {
  return Promise.all(Array.from({ length: concurrency }, promiseFactory));
}

export type InterruptReason = "user-cancel" | "selection-changed" | "document-changed";
export interface InterruptEventBase {
  reason: InterruptReason;
  originalEvent?: unknown;
}
export interface UserCancelInterruptEvent extends InterruptEventBase {
  reason: "user-cancel";
}
export interface SelectionChangedInterruptEvent extends InterruptEventBase {
  reason: "selection-changed";
  originalEvent: TextEditorSelectionChangeEvent;
}
export interface DocumentChangedInterruptEvent extends InterruptEventBase {
  reason: "document-changed";
  originalEvent: TextDocumentChangeEvent;
}
export type InterruptEvent = UserCancelInterruptEvent | SelectionChangedInterruptEvent | DocumentChangedInterruptEvent;

export abstract class EmacsCommand {
  public abstract readonly id: string;

  /**
   * Some commands are a part of a longer command sequence, such as `C-x r` that is followed by `i` or `s` to consist a complete command sequence `C-x r i` or `C-x r s`.
   * Such commands are flagged as intermediate commands so that they should not call `prefixArgumentHandler.cancel` to cancel the prefix argument in `EmacsEmulator.runCommand`.
   */
  public readonly isIntermediateCommand: boolean = false;

  protected emacsController: IEmacsController;

  public constructor(markModeController: IEmacsController) {
    this.emacsController = markModeController;
  }

  public abstract run(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
    args?: unknown,
  ): void | Thenable<unknown>;

  public onDidInterruptTextEditor?(event: InterruptEvent): void;
}

export interface ITextEditorInterruptionHandler {
  onDidInterruptTextEditor(event: InterruptEvent): void;
}

// This type guard trick is from https://stackoverflow.com/a/64163454/13103190
export function isTextEditorInterruptionHandler<T extends { onDidInterruptTextEditor?: unknown }>(
  obj: T,
): obj is T & ITextEditorInterruptionHandler {
  return typeof obj.onDidInterruptTextEditor === "function";
}
