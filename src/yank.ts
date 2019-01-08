import * as clipboardy from "clipboardy";
import * as vscode from "vscode";
import { Range, TextEditor } from "vscode";
import { KillRing } from "./kill-ring";

export class Yanker {
    private textEditor: TextEditor;
    private killRing: KillRing | null;  // If null, killRing is disabled and only clipboard is used.

    private docChangedAfterYank = false;
    private prevYankPositions: vscode.Position[];

    constructor(textEditor: TextEditor, killRing: KillRing | null) {
        this.textEditor = textEditor;
        this.killRing = killRing;

        this.docChangedAfterYank = false;
        this.onDidChangeTextDocument = this.onDidChangeTextDocument.bind(this);
        vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument);

        this.prevYankPositions = [];

    }

    public setTextEditor(textEditor: TextEditor) {
        this.textEditor = textEditor;
    }

    public getTextEditor(): TextEditor {
        return this.textEditor;
    }

    public onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent) {
        this.docChangedAfterYank = true;

        // XXX: Is this a correct way to check the identity of document?
        if (e.document.uri.toJSON() === this.textEditor.document.uri.toJSON()) {
            this.docChangedAfterYank = true;
        }
    }

    public copy(ranges: Range[]) {
        const text = this.getSortedRangesText(ranges);
        clipboardy.writeSync(text);

        if (this.killRing !== null) {
            this.killRing.push(text);
        }
    }

    public async yank() {
        if (this.killRing === null) {
            return vscode.commands.executeCommand("editor.action.clipboardPasteAction");
        }

        const clipboardText = clipboardy.readSync();
        const killRingText = this.killRing.getTop();

        let text: string;
        if (clipboardText && clipboardText === killRingText) {
            text = killRingText;
        } else {
            text = clipboardText;
            this.killRing.push(clipboardText);
        }

        await vscode.commands.executeCommand("paste", { text });

        this.docChangedAfterYank = false;
        this.prevYankPositions = this.textEditor.selections.map((selection) => selection.active);
    }

    public async yankPop() {
        if (this.killRing === null) {
            return;
        }

        if (this.isYankInterupted()) {
            return;
        }

        const text = this.killRing.pop();

        await vscode.commands.executeCommand("undo");
        await vscode.commands.executeCommand("paste", { text });

        this.docChangedAfterYank = false;
        this.prevYankPositions = this.textEditor.selections.map((selection) => selection.active);
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

    private isYankInterupted(): boolean {
        if (this.docChangedAfterYank) { return true; }

        const currentActives = this.textEditor.selections.map((selection) => selection.active);
        if (currentActives.length !== this.prevYankPositions.length) { return true; }
        if (currentActives.some((active, i) => !active.isEqual(this.prevYankPositions[i]))) { return true; }

        return false;
    }
}
