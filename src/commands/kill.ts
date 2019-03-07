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

function findNextWordRange(doc: TextDocument, position: Position) {
    const doclen = doc.getText().length;
    let idx = doc.offsetAt(position) + 1;
    while (idx < doclen) {
        const wordRange = doc.getWordRangeAtPosition(doc.positionAt(idx));
        if (wordRange !== undefined) {
            return wordRange;
        }
        idx++;
    }
}

export class KillWord extends KillYankCommand {
    public readonly id = "killWord";

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const nextWordRanges = textEditor.selections.map((selection) =>
            findNextWordRange(textEditor.document, selection.active));
        const killRanges: Range[] = nextWordRanges.map((nextWordRange, i) => {
            if (nextWordRange === undefined) {
                return undefined;
            }

            return new Range(textEditor.selections[i].active, nextWordRange.end);
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
