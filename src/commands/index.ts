import { TextEditor } from "vscode";

export function createParallel<T>(concurrency: number, promiseFactory: () => Thenable<T>): Thenable<T[]> {
    return Promise.all(Array.apply(null, Array(concurrency)).map(promiseFactory));
}

export abstract class EmacsCommand {
    private afterExecute: () => void;

    public constructor(afterExecute: () => void) {
        this.afterExecute = afterExecute;
    }

    public run(
        textEditor: TextEditor,
        isInMarkMode: boolean,
        prefixArgument: number | undefined,
    ): (undefined | Thenable<{} | undefined>) {
        this.execute(textEditor, isInMarkMode, prefixArgument);

        this.afterExecute();

        return;
    }

    public abstract execute(
        textEditor: TextEditor,
        isInMarkMode: boolean,
        prefixArgument: number | undefined,
    ): (undefined | Thenable<{} | undefined>);
}
