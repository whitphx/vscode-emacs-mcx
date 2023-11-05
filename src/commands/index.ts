import { IEmacsController } from "../emulator";

export function makeParallel<T>(concurrency: number, promiseFactory: () => Thenable<T>): Thenable<T[]> {
  return Promise.all(Array.from({ length: concurrency }, promiseFactory));
}

export abstract class EmacsCommand {
  public abstract readonly id: string;

  public constructor(protected emacsController: IEmacsController) {}

  public abstract run(prefixArgument: number | undefined): void | Thenable<unknown>;

  public onDidInterruptTextEditor?(): void;
}

export interface IEmacsCommandInterrupted {
  onDidInterruptTextEditor(): void;
}

// This type guard trick is from https://stackoverflow.com/a/64163454/13103190
export function instanceOfIEmacsCommandInterrupted<T extends { onDidInterruptTextEditor?: unknown }>(
  obj: T,
): obj is T & IEmacsCommandInterrupted {
  return typeof obj.onDidInterruptTextEditor === "function";
}
