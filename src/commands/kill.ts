// tslint:disable:max-classes-per-file
// tslint:disable:object-literal-sort-keys
import { Position, Range, Selection, TextEditor } from "vscode";
import { EmacsCommand } from ".";
import { EmacsEmulator } from "../emulator";
import { KillYanker } from "../kill-yank";

abstract class KillYankCommand extends EmacsCommand {
    protected emulator: EmacsEmulator;
    protected killYanker: KillYanker;

    public constructor(
        afterExecute: () => void,
        emulator: EmacsEmulator,  // XXX: kill and yank commands have to manipulate mark-mode status
        killYanker: KillYanker,
    ) {
        super(afterExecute);

        this.emulator = emulator;
        this.killYanker = killYanker;
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
        this.emulator.exitMarkMode();
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
        this.emulator.exitMarkMode();
        return this.killYanker.kill(ranges);
    }
}

function getNonEmptySelections(textEditor: TextEditor): Selection[] {
    return textEditor.selections.filter((selection) => !selection.isEmpty);
}

export class KillRegion extends KillYankCommand {
    public readonly id = "killRegion";

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const ranges = getNonEmptySelections(textEditor);
        await this.killYanker.kill(ranges);
        this.emulator.exitMarkMode();
        this.killYanker.cancelKillAppend();
    }
}

// TODO: Rename to kill-ring-save (original emacs command name)
export class CopyRegion extends KillYankCommand {
    public readonly id = "copyRegion";

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const ranges = getNonEmptySelections(textEditor);
        await this.killYanker.copy(ranges);
        this.emulator.exitMarkMode();
        this.killYanker.cancelKillAppend();
    }
}

export class Yank extends KillYankCommand {
    public readonly id = "yank";

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        await this.killYanker.yank();
        this.emulator.exitMarkMode();
    }
}

export class YankPop extends KillYankCommand {
    public readonly id = "yankPop";

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        await this.killYanker.yankPop();
        this.emulator.exitMarkMode();
    }
}
