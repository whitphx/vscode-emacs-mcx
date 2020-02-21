import { TextEditor } from "vscode";
import { IEmacsCommandRunner, IMarkModeController } from "../emulator";

export function createParallel<T>(concurrency: number, promiseFactory: () => Thenable<T>): Thenable<T[]> {
    return Promise.all(Array.from({ length: concurrency }, promiseFactory));
}

export abstract class EmacsCommand {
    public abstract readonly id: string;

    protected emacsController: IMarkModeController & IEmacsCommandRunner;
    private afterExecute: () => void;

    public constructor(afterExecute: () => void, markModeController: IMarkModeController & IEmacsCommandRunner) {
        this.afterExecute = afterExecute;
        this.emacsController = markModeController;
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
    ): (void | undefined | Thenable<{} | undefined | void> | Promise<void>);
}

export interface IEmacsCommandInterrupted {
    onDidInterruptTextEditor(): void;
}

export function instanceOfIEmacsCommandInterrupted(obj: any): obj is IEmacsCommandInterrupted {
    return typeof obj.onDidInterruptTextEditor === "function";
}
