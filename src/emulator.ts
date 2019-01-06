import * as vscode from "vscode";
import { Disposable, Selection, TextEditor } from "vscode";
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

    public makeSelectionsEmpty() {
        this.textEditor.selections = this.textEditor.selections.map((selection) =>
            new Selection(selection.active, selection.active));
    }

    public stopMultiCursor() {
        vscode.commands.executeCommand("removeSecondaryCursors");
    }

    public hasMultipleSelections(): boolean {
        return this.textEditor.selections.length > 1;
    }

    public hasNonEmptySelection(): boolean {
        return this.textEditor.selections.some((selection) => !selection.isEmpty);
    }

    public dispose() {
        // TODO
    }
}
