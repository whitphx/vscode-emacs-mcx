import * as clipboardy from "clipboardy";
import * as vscode from "vscode";
import { Disposable, Range, Selection, TextEditor } from "vscode";
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

    public copy() {
        clipboardy.writeSync(this.getSelectionsText());
        this.cancel();
    }

    public killLine() {
        // Select to the end of each line
        this.textEditor.selections = this.textEditor.selections.map((selection) => {
            const anchor = selection.anchor;
            const lineAtAnchor = this.textEditor.document.lineAt(anchor.line);
            return new Selection(anchor, lineAtAnchor.range.end);
        });

        return this.killRegion();
    }

    public async killRegion(appendClipboard?: boolean) {
        if (appendClipboard) {
            clipboardy.writeSync(clipboardy.readSync() + this.getSelectionsText());
        } else {
            clipboardy.writeSync(this.getSelectionsText());
        }

        await this.delete(this.getNonEmptySelections());
        this.exitMarkMode();
    }

    public yank(): Thenable<{} | undefined> {
        // TODO: multi cursor compatibility
        this.cancel();
        return vscode.commands.executeCommand("editor.action.clipboardPasteAction");
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

    private getNonEmptySelections(): Selection[] {
        return this.textEditor.selections.filter((selection) => !selection.isEmpty);
    }

    private getSelectionsText(): string {
        const ranges: Range[] = this.getNonEmptySelections();
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
