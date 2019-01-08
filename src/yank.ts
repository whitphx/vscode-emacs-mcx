import * as clipboardy from "clipboardy";
import * as vscode from "vscode";
import { Range, TextEditor } from "vscode";

export class Yanker {
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

    public copy(ranges: Range[]) {
        clipboardy.writeSync(this.getSortedRangesText(ranges));
    }

    public async yank() {
        await vscode.commands.executeCommand("editor.action.clipboardPasteAction");
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
