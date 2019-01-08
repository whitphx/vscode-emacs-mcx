import * as vscode from "vscode";
import { Disposable, Position, Range, Selection, TextEditor } from "vscode";
import { KillRing } from "./kill-ring";
import { cursorMoves } from "./operations";
import { Yanker } from "./yank";

const killRing = new KillRing(3);  // XXX

export class EmacsEmulator implements Disposable {
    private isInMarkMode = false;
    private textEditor: TextEditor;
    private yanker: Yanker;

    constructor(textEditor: TextEditor) {
        this.textEditor = textEditor;

        this.yanker = new Yanker(textEditor, killRing);
    }

    public setTextEditor(textEditor: TextEditor) {
        this.textEditor = textEditor;
        this.yanker.setTextEditor(textEditor);
    }

    public getTextEditor(): TextEditor {
        return this.textEditor;
    }

    public cursorMove(commandName: cursorMoves) {
        return vscode.commands.executeCommand(this.isInMarkMode ? `${commandName}Select` : commandName);
    }

    public enterMarkMode() {
        if (this.isInMarkMode && !this.hasNonEmptySelection()) {
            // Toggle if enterMarkMode is invoked continuously without any cursor move.
            this.isInMarkMode = false;
        } else {
            this.isInMarkMode = true;
        }
    }

    public exitMarkMode() {
        this.isInMarkMode = false;
    }

    /**
     * Invoked by C-g
     */
    public cancel() {
        if (this.hasMultipleSelections() && !this.hasNonEmptySelection()) {
            this.stopMultiCursor();
        } else {
            this.makeSelectionsEmpty();
        }

        if (this.isInMarkMode) {
            this.exitMarkMode();
        }
    }

    public copyRegion() {
        const ranges = this.getNonEmptySelections();
        this.yanker.copy(ranges);
        this.cancel();
    }

    public killLine() {
        const ranges = this.textEditor.selections.map((selection) => {
            const anchor = selection.anchor;
            const lineAtAnchor = this.textEditor.document.lineAt(selection.anchor.line);
            const lineEnd = lineAtAnchor.range.end;

            if (anchor.isEqual(lineEnd)) {
                // From the end of the line to the beginning of the next line
                return new Range(anchor, new Position(anchor.line + 1, 0));
            } else {
                // From the current cursor to the end of line
                return new Range(anchor, lineEnd);
            }
        });
        return this.killRanges(ranges);
    }

    public killWholeLine() {
        const ranges = this.textEditor.selections.map((selection) =>
            // From the beginning of the line to the beginning of the next line
            new Range(
                new Position(selection.anchor.line, 0),
                new Position(selection.anchor.line + 1, 0),
            ),
        );
        return this.killRanges(ranges);
    }

    public killRegion(appendClipboard?: boolean) {
        const ranges = this.getNonEmptySelections();
        return this.killRanges(ranges);
    }

    public async yank() {
        await this.yanker.yank();
        this.exitMarkMode();
    }

    public async yankPop() {
        await this.yanker.yankPop();
        this.exitMarkMode();
    }

    public delete(ranges: vscode.Range[]): Thenable<boolean> {
        return this.textEditor.edit((editBuilder) => {
            ranges.forEach((range) => {
                editBuilder.delete(range);
            });
        });
    }

    public deleteRight() {
        this.exitMarkMode();
        vscode.commands.executeCommand("deleteRight");
    }

    public deleteLeft() {
        this.exitMarkMode();
        vscode.commands.executeCommand("deleteLeft");
    }

    public async newLine() {
        this.makeSelectionsEmpty();
        this.exitMarkMode();
        await vscode.commands.executeCommand("lineBreakInsert");
        await vscode.commands.executeCommand("cursorHome");
        await vscode.commands.executeCommand("cursorDown");
    }

    public dispose() {
        delete this.yanker;
    }

    private makeSelectionsEmpty() {
        this.textEditor.selections = this.textEditor.selections.map((selection) =>
            new Selection(selection.active, selection.active));
    }

    private stopMultiCursor() {
        vscode.commands.executeCommand("removeSecondaryCursors");
    }

    private hasMultipleSelections(): boolean {
        return this.textEditor.selections.length > 1;
    }

    private hasNonEmptySelection(): boolean {
        return this.textEditor.selections.some((selection) => !selection.isEmpty);
    }

    private async killRanges(ranges: Range[]) {
        this.yanker.copy(ranges);
        await this.delete(ranges);
        this.exitMarkMode();
    }

    private getNonEmptySelections(): Selection[] {
        return this.textEditor.selections.filter((selection) => !selection.isEmpty);
    }
}
