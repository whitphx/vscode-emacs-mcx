import { TextEditor } from "vscode";
import { IEmacsCommandRunner, IMarkModeController } from "../emulator";

export function createParallel<T>(concurrency: number, promiseFactory: () => Thenable<T>): Thenable<T[]> {
  return Promise.all(Array.from({ length: concurrency }, promiseFactory));
}

export abstract class EmacsCommand {
  public abstract readonly id: string;

  protected emacsController: IMarkModeController & IEmacsCommandRunner;

  public constructor(markModeController: IMarkModeController & IEmacsCommandRunner) {
    this.emacsController = markModeController;
  }

  public run(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined
  ): Thenable<unknown> | void {
    return this.execute(textEditor, isInMarkMode, prefixArgument);
  }

  public abstract execute(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined
  ): void | Thenable<unknown>;
}

export interface IEmacsCommandInterrupted {
  onDidInterruptTextEditor(): void;
}

export function instanceOfIEmacsCommandInterrupted(obj: any): obj is IEmacsCommandInterrupted {
  return typeof obj.onDidInterruptTextEditor === "function";
}
