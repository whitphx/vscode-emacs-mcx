import * as vscode from "vscode";

function createParallel<T>(concurrency: number, promiseFactory: () => Thenable<T>): Thenable<T[]> {
    return Promise.all(Array.apply(null, Array(concurrency)).map(promiseFactory));
}

// tslint:disable:object-literal-sort-keys
export const moveCommands: {[command: string]: (arg: number, select: boolean) => (Thenable<any> | undefined)} = {
    forwardChar: (arg, select) =>
        vscode.commands.executeCommand("cursorMove",
            {
                to: "right",
                // by: "",
                value: arg,
                select,
            },
        ),
    backwardChar: (arg, select) =>
        vscode.commands.executeCommand("cursorMove",
            {
                to: "left",
                // by: "",
                value: arg,
                select,
            },
        ),
    nextLine: (arg, select) =>
        vscode.commands.executeCommand("cursorMove",
            {
                to: "down",
                by: "wrappedLine",
                value: arg,
                select,
            },
        ),
    previousLine: (arg, select) =>
        vscode.commands.executeCommand("cursorMove",
            {
                to: "up",
                by: "wrappedLine",
                value: arg,
                select,
            },
        ),
    moveBeginningOfLine: (arg, select) => {
        if (arg === 1) {
            return vscode.commands.executeCommand(select ? "cursorHomeSelect" : "cursorHome");
        } else if (arg > 1) {
            return vscode.commands.executeCommand("cursorMove", {
                to: "down",
                by: "line",
                value: arg - 1,
                select,
            }).then(() => vscode.commands.executeCommand(select ? "cursorHomeSelect" : "cursorHome"));
        }
    },
    moveEndOfLine: (arg, select) => {
        if (arg === 1) {
            return vscode.commands.executeCommand(select ? "cursorEndSelect" : "cursorEnd");
        } else if (arg > 1) {
            return vscode.commands.executeCommand("cursorMove", {
                to: "down",
                by: "line",
                value: arg - 1,
                select,
            }).then(() => vscode.commands.executeCommand(select ? "cursorEndSelect" : "cursorEnd"));
        }
    },
    forwardWord: (arg, select) => createParallel(arg, () =>
        vscode.commands.executeCommand(select ? "cursorWordRightSelect" : "cursorWordRight")),
    backwardWord: (arg, select) => createParallel(arg, () =>
        vscode.commands.executeCommand(select ? "cursorWordLeftSelect" : "cursorWordLeft")),
    beginningOfBuffer: (arg, select) =>
        vscode.commands.executeCommand(select ? "cursorTopSelect" : "cursorTop"),
    endOfBuffer: (arg, select) =>
        vscode.commands.executeCommand(select ? "cursorBottomSelect" : "cursorBottom"),
    scrollUpCommand: (arg, select) => createParallel(arg, () =>
        vscode.commands.executeCommand(select ? "cursorPageDownSelect" : "cursorPageDown")),
    scrollDownCommand: (arg, select) => createParallel(arg, () =>
        vscode.commands.executeCommand(select ? "cursorPageUpSelect" : "cursorPageUp")),
};
