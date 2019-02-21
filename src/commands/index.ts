import { TextEditor } from "vscode";

export function createParallel<T>(concurrency: number, promiseFactory: () => Thenable<T>): Thenable<T[]> {
    return Promise.all(Array.apply(null, Array(concurrency)).map(promiseFactory));
}

export abstract class EmacsCommand {
    public abstract readonly id: string;

    private afterExecute: () => void;

    public constructor(afterExecute: () => void) {
        this.afterExecute = afterExecute;
    }

    public run(
        textEditor: TextEditor,
        isInMarkMode: boolean,
        prefixArgument: number | undefined,
    ): (undefined | Thenable<{} | undefined | void>) {
        const ret = this.execute(textEditor, isInMarkMode, prefixArgument);
        if (ret !== undefined && (ret as Thenable<any>).then !== undefined) {
            return (ret as Thenable<any>).then(() => this.afterExecute());
        } else {
            this.afterExecute();
            return;
        }
    }

    public abstract execute(
        textEditor: TextEditor,
        isInMarkMode: boolean,
        prefixArgument: number | undefined,
    ): (void | undefined | Thenable<{} | undefined> | Promise<void>);
}

export interface IEmacsCommandInterrupted {
    onDidInterruptTextEditor(): void;
}

export function instanceOfIEmacsCommandInterrupted(obj: any): obj is IEmacsCommandInterrupted {
    return typeof obj.onDidInterruptTextEditor === "function";
}
