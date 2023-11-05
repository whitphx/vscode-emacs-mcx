import { TextEditor } from "vscode";
import { IEmacsController } from "../emulator";

export function makeParallel<T>(concurrency: number, promiseFactory: () => Thenable<T>): Thenable<T[]> {
  return Promise.all(Array.from({ length: concurrency }, promiseFactory));
}

export abstract class EmacsCommand {
  public abstract readonly id: string;

  protected emacsController: IEmacsController;

  public constructor(markModeController: IEmacsController) {
    this.emacsController = markModeController;
  }

  public run(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
  ): Thenable<unknown> | void {
    return this.execute(textEditor, isInMarkMode, prefixArgument);
  }

  public abstract execute(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
  ): void | Thenable<unknown>;

  public onDidInterruptTextEditor?(): void;
}

export interface IEmacsCommandInterrupted {
  onDidInterruptTextEditor(): void;
}

export function instanceOfIEmacsCommandInterrupted<T extends { onDidInterruptTextEditor?: unknown }>(
  obj: T,
): obj is T & IEmacsCommandInterrupted {
  return typeof obj.onDidInterruptTextEditor === "function";
}
