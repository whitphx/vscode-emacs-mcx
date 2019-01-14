import * as clipboardy from "clipboardy";
import * as vscode from "vscode";
import { Position, Range, TextEditor } from "vscode";
import { EditorIdentity } from "./editorIdentity";
import { KillRing } from "./kill-ring";
import { ClipboardTextKillRingEntity } from "./kill-ring-entity/clipboard-text";
import { EditorTextKillRingEntity } from "./kill-ring-entity/editor-text";
import { equalPositons } from "./utils";

export class KillYanker {
    private textEditor: TextEditor;
    private killRing: KillRing | null;  // If null, killRing is disabled and only clipboard is used.

    private isAppending = false;
    private prevKillPositions: Position[];
    private docChangedAfterYank = false;
    private prevYankPositions: Position[];

    constructor(textEditor: TextEditor, killRing: KillRing | null) {
        this.textEditor = textEditor;
        this.killRing = killRing;

        this.docChangedAfterYank = false;
        this.prevKillPositions = [];
        this.prevYankPositions = [];

        this.onDidChangeTextDocument = this.onDidChangeTextDocument.bind(this);
        vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument);
        this.onDidChangeTextEditorSelection = this.onDidChangeTextEditorSelection.bind(this);
        vscode.window.onDidChangeTextEditorSelection(this.onDidChangeTextEditorSelection);
    }

    public setTextEditor(textEditor: TextEditor) {
        this.textEditor = textEditor;
    }

    public getTextEditor(): TextEditor {
        return this.textEditor;
    }

    public onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent) {
        // XXX: Is this a correct way to check the identity of document?
        if (e.document.uri.toString() === this.textEditor.document.uri.toString()) {
            this.docChangedAfterYank = true;
            this.isAppending = false;
        }
    }

    public onDidChangeTextEditorSelection(e: vscode.TextEditorSelectionChangeEvent) {
        if (new EditorIdentity(e.textEditor).isEqual(new EditorIdentity(this.textEditor))) {
            this.docChangedAfterYank = true;
            this.isAppending = false;
        }
    }

    public async kill(ranges: Range[]) {
        if (!equalPositons(this.getCursorPositions(), this.prevKillPositions)) {
            this.isAppending = false;
        }

        this.copy(ranges, this.isAppending);

        await this.delete(ranges);

        this.isAppending = true;
        this.prevKillPositions = this.getCursorPositions();
    }

    public copy(ranges: Range[], shouldAppend = false) {
        const newKillEntity = new EditorTextKillRingEntity(ranges.map((range) => ({
            range,
            text: this.textEditor.document.getText(range),
        })));

        if (this.killRing !== null) {
            const currentKill = this.killRing.getTop();
            if (shouldAppend && currentKill instanceof EditorTextKillRingEntity) {
                currentKill.append(newKillEntity);
                clipboardy.writeSync(currentKill.asString());
            } else {
                this.killRing.push(newKillEntity);
                clipboardy.writeSync(newKillEntity.asString());
            }
        } else {
            clipboardy.writeSync(newKillEntity.asString());
        }
    }

    public cancelKillAppend() {
        this.isAppending = false;
    }

    public async yank() {
        if (this.killRing === null) {
            return vscode.commands.executeCommand("editor.action.clipboardPasteAction");
        }

        const clipboardText = clipboardy.readSync();
        const killRingEntity = this.killRing.getTop();

        let pasteText: string;
        if (killRingEntity === null || !killRingEntity.isSameClipboardText(clipboardText)) {
            this.killRing.push(new ClipboardTextKillRingEntity(clipboardText));
            pasteText = clipboardText;
        } else {
            pasteText = killRingEntity.asString();
        }

        await vscode.commands.executeCommand("paste", { text: pasteText });

        this.docChangedAfterYank = false;
        this.prevYankPositions = this.textEditor.selections.map((selection) => selection.active);
    }

    public async yankPop() {
        if (this.killRing === null) {
            return;
        }

        if (this.isYankInterupted()) {
            vscode.window.setStatusBarMessage("Previous command was not a yank");
            return;
        }

        const killRingEntity = this.killRing.pop();
        if (killRingEntity === null) {
            return;
        }
        const text = killRingEntity.asString();

        await vscode.commands.executeCommand("undo");
        await vscode.commands.executeCommand("paste", { text });

        this.docChangedAfterYank = false;
        this.prevYankPositions = this.textEditor.selections.map((selection) => selection.active);
    }

    private delete(ranges: vscode.Range[]): Thenable<boolean> {
        return this.textEditor.edit((editBuilder) => {
            ranges.forEach((range) => {
                editBuilder.delete(range);
            });
        });
    }

    private isYankInterupted(): boolean {
        if (this.docChangedAfterYank) { return true; }

        const currentActives = this.getCursorPositions();
        return !equalPositons(currentActives, this.prevYankPositions);
    }

    private getCursorPositions(): Position[] {
        return this.textEditor.selections.map((selection) => selection.active);
    }
}
