// tslint:disable:max-classes-per-file
// tslint:disable:object-literal-sort-keys
import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { createParallel, EmacsCommand } from ".";

// TODO: be unnecessary
export const moveCommandIds = [
    "forwardChar", "backwardChar", "nextLine", "previousLine",
    "moveBeginningOfLine", "moveEndOfLine", "forwardWord", "backwardWord",
    "beginningOfBuffer", "endOfBuffer", "scrollUpCommand", "scrollDownCommand",
];

export class ForwardChar extends EmacsCommand {
    public readonly id = "forwardChar";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        if (prefixArgument === undefined || prefixArgument === 1) {
            return vscode.commands.executeCommand(isInMarkMode ? "cursorRightSelect" : "cursorRight");
        } else if (prefixArgument > 0) {
            const doc = textEditor.document;
            const newSelections = textEditor.selections.map((selection) => {
                const offset = doc.offsetAt(selection.active);
                const newActivePos = doc.positionAt(offset + prefixArgument);
                const newAnchorPos = isInMarkMode ? selection.anchor : newActivePos;
                return new vscode.Selection(newAnchorPos, newActivePos);
            });
            textEditor.selections = newSelections;
        }
    }
}

export class BackwardChar extends EmacsCommand {
    public readonly id = "backwardChar";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        if (prefixArgument === undefined || prefixArgument === 1) {
            return vscode.commands.executeCommand(isInMarkMode ? "cursorLeftSelect" : "cursorLeft");
        } else if (prefixArgument > 0) {
            const doc = textEditor.document;
            const newSelections = textEditor.selections.map((selection) => {
                const offset = doc.offsetAt(selection.active);
                const newActivePos = doc.positionAt(offset - prefixArgument);
                const newAnchorPos = isInMarkMode ? selection.anchor : newActivePos;
                return new vscode.Selection(newAnchorPos, newActivePos);
            });
            textEditor.selections = newSelections;
        }
    }
}

export class NextLine extends EmacsCommand {
    public readonly id = "nextLine";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const value = prefixArgument === undefined ? 1 : prefixArgument;

        return vscode.commands.executeCommand("cursorMove",
            {
                to: "down",
                by: "wrappedLine",
                value,
                select: isInMarkMode,
            },
        );
    }
}

export class PreviousLine extends EmacsCommand {
    public readonly id = "previousLine";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const value = prefixArgument === undefined ? 1 : prefixArgument;

        return vscode.commands.executeCommand("cursorMove",
            {
                to: "up",
                by: "wrappedLine",
                value,
                select: isInMarkMode,
            },
        );
    }
}

export class MoveBeginningOfLine extends EmacsCommand {
    public readonly id = "moveBeginningOfLine";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        if (prefixArgument === undefined || prefixArgument === 1) {
            return vscode.commands.executeCommand(isInMarkMode ? "cursorHomeSelect" : "cursorHome");
        } else if (prefixArgument > 1) {
            return vscode.commands.executeCommand("cursorMove", {
                to: "down",
                by: "line",
                value: prefixArgument - 1,
                isInMarkMode,
            }).then(() => vscode.commands.executeCommand(isInMarkMode ? "cursorHomeSelect" : "cursorHome"));
        }
    }
}

export class MoveEndOfLine extends EmacsCommand {
    public readonly id = "moveEndOfLine";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        if (prefixArgument === undefined || prefixArgument === 1) {
            return vscode.commands.executeCommand(isInMarkMode ? "cursorEndSelect" : "cursorEnd");
        } else if (prefixArgument > 1) {
            return vscode.commands.executeCommand("cursorMove", {
                to: "down",
                by: "line",
                value: prefixArgument - 1,
                isInMarkMode,
            }).then(() => vscode.commands.executeCommand(isInMarkMode ? "cursorEndSelect" : "cursorEnd"));
        }
    }
}

export class ForwardWord extends EmacsCommand {
    public readonly id = "forwardWord";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const repeat = prefixArgument === undefined ? 1 : prefixArgument;
        return createParallel(repeat, () =>
            vscode.commands.executeCommand(isInMarkMode ? "cursorWordRightSelect" : "cursorWordRight"));
    }
}

export class BackwardWord extends EmacsCommand {
    public readonly id = "backwardWord";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const repeat = prefixArgument === undefined ? 1 : prefixArgument;
        return createParallel(repeat, () =>
            vscode.commands.executeCommand(isInMarkMode ? "cursorWordLeftSelect" : "cursorWordLeft"));
    }
}

export class BeginningOfBuffer extends EmacsCommand {
    public readonly id = "beginningOfBuffer";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const repeat = prefixArgument === undefined ? 1 : prefixArgument;
        return createParallel(repeat, () =>
            vscode.commands.executeCommand(isInMarkMode ? "cursorTopSelect" : "cursorTop"));
    }
}

export class EndOfBuffer extends EmacsCommand {
    public readonly id = "endOfBuffer";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const repeat = prefixArgument === undefined ? 1 : prefixArgument;
        return createParallel(repeat, () =>
            vscode.commands.executeCommand(isInMarkMode ? "cursorBottomSelect" : "cursorBottom"));
    }
}

export class ScrollUpCommand extends EmacsCommand {
    public readonly id = "scrollUpCommand";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const repeat = prefixArgument === undefined ? 1 : prefixArgument;
        return createParallel(repeat, () =>
            repeat > 1 ?
            vscode.commands.executeCommand("cursorMove", {
                to: "down",
                by: "line",
                value: repeat,
                select: isInMarkMode
            }).then(()=>
                vscode.commands.executeCommand("editorScroll", {
                    to: "down",
                    by: "line",
                    value: repeat
                 })
            ) :
            vscode.commands.executeCommand(isInMarkMode ? "cursorPageDownSelect" : "cursorPageDown")
        );
    }
}

export class ScrollDownCommand extends EmacsCommand {
    public readonly id = "scrollDownCommand";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const repeat = prefixArgument === undefined ? 1 : prefixArgument;
        return createParallel(repeat, () =>
            repeat > 1 ?
            vscode.commands.executeCommand("cursorMove", {
                to: "up",
                by: "line",
                value: repeat,
                select: isInMarkMode
            }).then(()=>
                vscode.commands.executeCommand("editorScroll", {
                    to: "up",
                    by: "line",
                    value: repeat
                })
            ) :
            vscode.commands.executeCommand(isInMarkMode ? "cursorPageUpSelect" : "cursorPageUp")
        );
    }
}
