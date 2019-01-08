import * as clipboardy from "clipboardy";
import * as vscode from "vscode";
import { Range, TextEditor } from "vscode";
import { KillRing } from "./kill-ring";

export class Yanker {
    private textEditor: TextEditor;
    private killRing: KillRing;

    constructor(textEditor: TextEditor, killRing: KillRing) {
        this.textEditor = textEditor;
        this.killRing = killRing;
    }

    public setTextEditor(textEditor: TextEditor) {
        this.textEditor = textEditor;
    }

    public getTextEditor(): TextEditor {
        return this.textEditor;
    }

    public copy(ranges: Range[]) {
        const text = this.getSortedRangesText(ranges);
        clipboardy.writeSync(text);
        this.killRing.push(text);
    }

    public async yank() {
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
    }

    public async yankPop() {
        const text = this.killRing.pop();

        await vscode.commands.executeCommand("undo");
        await vscode.commands.executeCommand("paste", { text });
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
