import * as vscode from "vscode";

function createParallel<T>(concurrency: number, promiseFactory: () => Thenable<T>): Thenable<T[]> {
    return Promise.all(Array.apply(null, Array(concurrency)).map(promiseFactory));
}

// tslint:disable:object-literal-sort-keys
export const moveCommands: {
    [command: string]:
        (textEditor: vscode.TextEditor, arg: number, select: boolean) =>
            (Thenable<any> | undefined),
} = {
    forwardChar: (textEditor, arg, select) => {
        if (arg === 1) {
            return vscode.commands.executeCommand(select ? "cursorRightSelect" : "cursorRight");
        } else if (arg > 0) {
            const doc = textEditor.document;
            const newSelections = textEditor.selections.map((selection) => {
                const offset = doc.offsetAt(selection.active);
                const newActivePos = doc.positionAt(offset + arg);
                const newAnchorPos = select ? selection.anchor : newActivePos;
                return new vscode.Selection(newAnchorPos, newActivePos);
            });
            textEditor.selections = newSelections;
        }
    },
    backwardChar: (textEditor, arg, select) => {
        if (arg === 1) {
            return vscode.commands.executeCommand(select ? "cursorLeftSelect" : "cursorLeft");
        } else if (arg > 0) {
            const doc = textEditor.document;
            const newSelections = textEditor.selections.map((selection) => {
                const offset = doc.offsetAt(selection.active);
                const newActivePos = doc.positionAt(offset - arg);
                const newAnchorPos = select ? selection.anchor : newActivePos;
                return new vscode.Selection(newAnchorPos, newActivePos);
            });
            textEditor.selections = newSelections;
        }
    },
    nextLine: (textEditor, arg, select) =>
        vscode.commands.executeCommand("cursorMove",
            {
                to: "down",
                by: "wrappedLine",
                value: arg,
                select,
            },
        ),
    previousLine: (textEditor, arg, select) =>
        vscode.commands.executeCommand("cursorMove",
            {
                to: "up",
                by: "wrappedLine",
                value: arg,
                select,
            },
        ),
    moveBeginningOfLine: (textEditor, arg, select) => {
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
    moveEndOfLine: (textEditor, arg, select) => {
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
    forwardWord: (textEditor, arg, select) => createParallel(arg, () =>
        vscode.commands.executeCommand(select ? "cursorWordRightSelect" : "cursorWordRight")),
    backwardWord: (textEditor, arg, select) => createParallel(arg, () =>
        vscode.commands.executeCommand(select ? "cursorWordLeftSelect" : "cursorWordLeft")),
    beginningOfBuffer: (textEditor, arg, select) =>
        vscode.commands.executeCommand(select ? "cursorTopSelect" : "cursorTop"),
    endOfBuffer: (textEditor, arg, select) =>
        vscode.commands.executeCommand(select ? "cursorBottomSelect" : "cursorBottom"),
    scrollUpCommand: (textEditor, arg, select) => createParallel(arg, () =>
        vscode.commands.executeCommand(select ? "cursorPageDownSelect" : "cursorPageDown")),
    scrollDownCommand: (textEditor, arg, select) => createParallel(arg, () =>
        vscode.commands.executeCommand(select ? "cursorPageUpSelect" : "cursorPageUp")),
};
