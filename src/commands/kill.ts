// tslint:disable:max-classes-per-file
// tslint:disable:object-literal-sort-keys
import { Position, Range, Selection, TextDocument, TextEditor } from "vscode";
import { EmacsCommand } from ".";
import { IEmacsCommandRunner, IMarkModeController } from "../emulator";
import { KillYanker } from "../kill-yank";

abstract class KillYankCommand extends EmacsCommand {
    protected killYanker: KillYanker;

    public constructor(
        afterExecute: () => void,
        emacsController: IMarkModeController & IEmacsCommandRunner,
        killYanker: KillYanker,
    ) {
        super(afterExecute, emacsController);

        this.killYanker = killYanker;
    }
}

function findNextKillWordRange(doc: TextDocument, position: Position, repeat: number = 1) {
    const doclen = doc.getText().length;
    let idx = doc.offsetAt(position) + 1;

    let foundWords = 0;
    const killRanges = [];

    while (idx <= doclen && foundWords < repeat) {
        const wordRange = doc.getWordRangeAtPosition(doc.positionAt(idx));
        if (wordRange !== undefined) {
            killRanges.push(wordRange);
            foundWords++;
            idx = doc.offsetAt(wordRange.end);
        }
        idx++;
    }

    // If there are spaces (or some non-word characters)
    // between the current position and the end of the document,
    // it should be killed too.
    if (foundWords < repeat) {
        killRanges.push(new Range(doc.positionAt(idx), doc.positionAt(doclen)));
    }

    if (killRanges.length === 0) { return undefined; }

    return new Range(killRanges[0].start, killRanges[killRanges.length - 1].end);
}

export class KillWord extends KillYankCommand {
    public readonly id = "killWord";

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const repeat = prefixArgument === undefined ? 1 : prefixArgument;
        if (repeat <= 0) { return; }

        const nextWordRanges = textEditor.selections.map((selection) =>
            findNextKillWordRange(textEditor.document, selection.active, repeat));
        const killRanges: Range[] = nextWordRanges.map((nextWordRange, i) => {
            if (nextWordRange === undefined) {
                return undefined;
            }

            return new Range(textEditor.selections[i].active, nextWordRange.end);
        }).filter((range): range is Range => range !== undefined);
        await this.killYanker.kill(killRanges);
    }
}

function findPreviousKillWordRange(doc: TextDocument, position: Position, repeat: number = 1) {
    // const doclen = doc.getText().length;
    let idx = doc.offsetAt(position) - 1;

    let foundWords = 0;
    const killRanges = [];

    while (0 <= idx && foundWords < repeat) {
        const wordRange = doc.getWordRangeAtPosition(doc.positionAt(idx));
        if (wordRange !== undefined) {
            killRanges.push(wordRange);
            foundWords++;
            idx = doc.offsetAt(wordRange.start);
        }
        idx--;
    }

    // If there are spaces (or some non-word characters)
    // between the current position and the beginning of the document,
    // it should be killed too.
    if (foundWords < repeat) {
        killRanges.push(new Range(new Position(0, 0), doc.positionAt(idx)));
    }

    if (killRanges.length === 0) { return undefined; }

    return new Range(killRanges[killRanges.length - 1].start, killRanges[0].end);
}

export class BackwardKillWord extends KillYankCommand {
    public readonly id = "backwardKillWord";

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const repeat = prefixArgument === undefined ? 1 : prefixArgument;
        if (repeat <= 0) { return; }

        const previousWordRanges = textEditor.selections.map((selection) =>
            findPreviousKillWordRange(textEditor.document, selection.active, repeat));
        const killRanges: Range[] = previousWordRanges.map((previousWordRange, i) => {
            if (previousWordRange === undefined) {
                return undefined;
            }

            return new Range(previousWordRange.start, textEditor.selections[i].active);
        }).filter((range): range is Range => range !== undefined);
        await this.killYanker.kill(killRanges);
    }
}

export class KillLine extends KillYankCommand {
    public readonly id = "killLine";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const ranges = textEditor.selections.map((selection) => {
            const cursor = selection.anchor;
            const lineAtCursor = textEditor.document.lineAt(cursor.line);

            if (prefixArgument !== undefined) {
                return new Range(cursor, new Position(cursor.line + prefixArgument, 0));
            }

            const lineEnd = lineAtCursor.range.end;

            if (cursor.isEqual(lineEnd)) {
                // From the end of the line to the beginning of the next line
                return new Range(cursor, new Position(cursor.line + 1, 0));
            } else {
                // From the current cursor to the end of line
                return new Range(cursor, lineEnd);
            }
        });
        this.emacsController.exitMarkMode();
        return this.killYanker.kill(ranges);
    }
}

export class KillWholeLine extends KillYankCommand {
    public readonly id = "killWholeLine";

    public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const ranges = textEditor.selections.map((selection) =>
            // From the beginning of the line to the beginning of the next line
            new Range(
                new Position(selection.anchor.line, 0),
                new Position(selection.anchor.line + 1, 0),
            ),
        );
        this.emacsController.exitMarkMode();
        return this.killYanker.kill(ranges);
    }
}

function getNonEmptySelections(textEditor: TextEditor): Selection[] {
    return textEditor.selections.filter((selection) => !selection.isEmpty);
}

function makeSelectionsEmpty(textEditor: TextEditor) {
    textEditor.selections = textEditor.selections.map((selection) =>
        new Selection(selection.active, selection.active));
}

export class KillRegion extends KillYankCommand {
    public readonly id = "killRegion";

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const ranges = getNonEmptySelections(textEditor);
        await this.killYanker.kill(ranges);
        this.emacsController.exitMarkMode();
        this.killYanker.cancelKillAppend();
    }
}

// TODO: Rename to kill-ring-save (original emacs command name)
export class CopyRegion extends KillYankCommand {
    public readonly id = "copyRegion";

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const ranges = getNonEmptySelections(textEditor);
        await this.killYanker.copy(ranges);
        this.emacsController.exitMarkMode();
        this.killYanker.cancelKillAppend();
        makeSelectionsEmpty(textEditor);
    }
}

export class Yank extends KillYankCommand {
    public readonly id = "yank";

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        await this.killYanker.yank();
        this.emacsController.exitMarkMode();
    }
}

export class YankPop extends KillYankCommand {
    public readonly id = "yankPop";

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        await this.killYanker.yankPop();
        this.emacsController.exitMarkMode();
    }
}
