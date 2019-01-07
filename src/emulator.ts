import * as clipboardy from "clipboardy";
import * as vscode from "vscode";
import { Disposable, Position, Range, Selection, TextEditor } from "vscode";
import { cursorMoves } from "./operations";

export class EmacsEmulator implements Disposable {
    private isInMarkMode = false;
    private textEditor: TextEditor;

    constructor(textEditor: TextEditor) {
        this.textEditor = textEditor;
    }

    public setTextEditor(textEditor: TextEditor) {
        this.textEditor = textEditor;
    }

    public getTextEditor(): TextEditor {
        return this.textEditor;
    }

    public cursorMove(commandName: cursorMoves) {
        vscode.commands.executeCommand(this.isInMarkMode ? `${commandName}Select` : commandName);
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
        this.copyRanges(ranges);
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
        // TODO: multi cursor compatibility
        await vscode.commands.executeCommand("editor.action.clipboardPasteAction");
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

    public dispose() {
        // TODO
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

    private copyRanges(ranges: Range[]) {
        clipboardy.writeSync(this.getSortedRangesText(ranges));
    }

    private async killRanges(ranges: Range[]) {
        this.copyRanges(ranges);
        await this.delete(ranges);
        this.exitMarkMode();
    }

    private getNonEmptySelections(): Selection[] {
        return this.textEditor.selections.filter((selection) => !selection.isEmpty);
    }

    private getSortedRangesText(ranges: Range[]): string {
        const sortedRanges = ranges
            .sort((a, b) => {
                if (a.start.line === b.start.line) {
                    return a.start.character - b.start.character;
                } else {
                    return a.start.line - b.start.line;
                }
            });

        let allText = "";
        sortedRanges.forEach((range, i) => {
            const selectedText = this.textEditor.document.getText(range);
            const prevRange = sortedRanges[i - 1];
            if (prevRange && prevRange.start.line !== range.start.line) {
                allText += "\n" + selectedText;
            } else {
                allText += selectedText;
            }
        });

        return allText;
    }
}
