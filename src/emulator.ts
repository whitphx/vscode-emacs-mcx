import * as vscode from "vscode";
import { Disposable, Position, Range, Selection, TextEditor } from "vscode";
import { KillRing } from "./kill-ring";
import { KillYanker } from "./kill-yank";
import { MessageManager } from "./message";
import { cursorMoves } from "./operations";
import { Recenterer } from "./recenter";

export class EmacsEmulator implements Disposable {
    private textEditor: TextEditor;

    private isInMarkMode = false;

    private killYanker: KillYanker;
    private recenterer: Recenterer;

    constructor(textEditor: TextEditor, killRing: KillRing | null = null) {
        this.textEditor = textEditor;

        this.killYanker = new KillYanker(textEditor, killRing);
        this.recenterer = new Recenterer(textEditor);

        this.onDidChangeTextDocument = this.onDidChangeTextDocument.bind(this);
        vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument);
    }

    public setTextEditor(textEditor: TextEditor) {
        this.textEditor = textEditor;
        this.killYanker.setTextEditor(textEditor);
        this.recenterer.setTextEditor(textEditor);
    }

    public getTextEditor(): TextEditor {
        return this.textEditor;
    }

    public onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent) {
        // XXX: Is this a correct way to check the identity of document?
        if (e.document.uri.toString() === this.textEditor.document.uri.toString()) {
            if (e.contentChanges.some((contentChange) =>
                this.textEditor.selections.some((selection) =>
                    typeof contentChange.range.intersection(selection) !== "undefined",
                ),
            )) {
                this.exitMarkMode();
            }
        }
    }

    public cursorMove(commandName: cursorMoves) {
        return vscode.commands.executeCommand(this.isInMarkMode ? `${commandName}Select` : commandName);
    }

    public enterMarkMode() {
        if (this.isInMarkMode && !this.hasNonEmptySelection()) {
            // Toggle if enterMarkMode is invoked continuously without any cursor move.
            this.isInMarkMode = false;
            MessageManager.showMessage("Mark deactivated");
        } else {
            this.isInMarkMode = true;
            MessageManager.showMessage("Mark activated");
        }
    }

    public exitMarkMode() {
        this.isInMarkMode = false;
    }

    public addSelectionToNextFindMatch() {
        this.isInMarkMode = true;
        return vscode.commands.executeCommand("editor.action.addSelectionToNextFindMatch");
    }

    public addSelectionToPreviousFindMatch() {
        this.isInMarkMode = true;
        return vscode.commands.executeCommand("editor.action.addSelectionToPreviousFindMatch");
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

        this.killYanker.cancelKillAppend();
        this.recenterer.reset();

        MessageManager.showMessage("Quit");
    }

    public copyRegion() {
        const ranges = this.getNonEmptySelections();
        this.killYanker.copy(ranges);
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
        this.exitMarkMode();
        return this.killYanker.kill(ranges);
    }

    public killWholeLine() {
        const ranges = this.textEditor.selections.map((selection) =>
            // From the beginning of the line to the beginning of the next line
            new Range(
                new Position(selection.anchor.line, 0),
                new Position(selection.anchor.line + 1, 0),
            ),
        );
        this.exitMarkMode();
        return this.killYanker.kill(ranges);
    }

    public async killRegion(appendClipboard?: boolean) {
        const ranges = this.getNonEmptySelections();
        await this.killYanker.kill(ranges);
        this.exitMarkMode();
        this.cancelKillAppend();
    }

    public cancelKillAppend() {
        this.killYanker.cancelKillAppend();
    }

    public async yank() {
        await this.killYanker.yank();
        this.exitMarkMode();
    }

    public async yankPop() {
        await this.killYanker.yankPop();
        this.exitMarkMode();
    }

    public async newLine() {
        this.makeSelectionsEmpty();
        this.exitMarkMode();

        // XXX: How to emulate Enter key...?
        await vscode.commands.executeCommand("lineBreakInsert");

        this.textEditor.selections = this.textEditor.selections.map((selection) => {
            const lineNum = selection.active.line + 1;
            const indent = this.textEditor.document.lineAt(lineNum).firstNonWhitespaceCharacterIndex;
            const cursorPos = new Position(lineNum, indent);
            return new Selection(cursorPos, cursorPos);
        });
    }

    public async transformToUppercase() {
        await vscode.commands.executeCommand("emacs-mcx.cursorWordRight");
        await vscode.commands.executeCommand("editor.action.transformToUppercase");
    }

    public async transformToLowercase() {
        await vscode.commands.executeCommand("emacs-mcx.cursorWordRight");
        await vscode.commands.executeCommand("editor.action.transformToLowercase");
    }

    public recenterTopBottom() {
        this.recenterer.recenterTopBottom();
    }

    public dispose() {
        delete this.killYanker;
        delete this.recenterer;
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
}
