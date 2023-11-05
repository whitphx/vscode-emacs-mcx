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

  public run(prefixArgument: number | undefined): Thenable<unknown> | void {
    return this.execute(prefixArgument);
  }

  public abstract execute(prefixArgument: number | undefined): void | Thenable<unknown>;
}

export interface IEmacsCommandInterrupted {
  onDidInterruptTextEditor(): void;
}

export function instanceOfIEmacsCommandInterrupted(obj: any): obj is IEmacsCommandInterrupted {
  return typeof obj.onDidInterruptTextEditor === "function";
}
