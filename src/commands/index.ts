import { TextEditor } from "vscode";
import { IEmacsCommandRunner, IMarkModeController } from "../emulator";

export function createParallel<T>(concurrency: number, promiseFactory: () => Thenable<T>): Thenable<T[]> {
  return Promise.all(Array.from({ length: concurrency }, promiseFactory));
}

export abstract class EmacsCommand {
  public abstract readonly id: string;

  protected emacsController: IMarkModeController & IEmacsCommandRunner;
  private afterExecute: () => void | Promise<unknown>;

  public constructor(afterExecute: () => void, markModeController: IMarkModeController & IEmacsCommandRunner) {
    this.afterExecute = afterExecute;
    this.emacsController = markModeController;
  }

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<unknown> {
    const ret = this.execute(textEditor, isInMarkMode, prefixArgument);
    if (ret != null) {
      return ret.then(this.afterExecute);
    } else {
      return Promise.resolve(this.afterExecute());
    }
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
