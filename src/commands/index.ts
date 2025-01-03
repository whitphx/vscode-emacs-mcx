import { TextEditor } from "vscode";
import type { IEmacsController } from "../emulator";

export function makeParallel<T>(concurrency: number, promiseFactory: () => Thenable<T>): Thenable<T[]> {
  return Promise.all(Array.from({ length: concurrency }, promiseFactory));
}

export abstract class EmacsCommand {
  public abstract readonly id: string;

  /**
   * Some commands are a part of a longer command sequence, such as `C-x r` that is followed by `i` or `s` to consist a complete command sequence `C-x r i` or `C-x r s`.
   * Such commands are flagged as intermediate commands so that they should not call `afterCommand` and cancel the prefix argument in `EmacsEmulator.runCommand`.
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
    args?: unknown[],
  ): void | Thenable<unknown>;

  public onDidInterruptTextEditor?(): void;
}

export interface ITextEditorInterruptionHandler {
  onDidInterruptTextEditor(): void;
}

// This type guard trick is from https://stackoverflow.com/a/64163454/13103190
export function isTextEditorInterruptionHandler<T extends { onDidInterruptTextEditor?: unknown }>(
  obj: T,
): obj is T & ITextEditorInterruptionHandler {
  return typeof obj.onDidInterruptTextEditor === "function";
}
