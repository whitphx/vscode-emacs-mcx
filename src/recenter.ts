import * as vscode from "vscode";
import { TextEditor, TextEditorRevealType } from "vscode";
import { EditorIdentity } from "./editorIdentity";

enum RecenterPosition {
    Middle,
    Top,
    Bottom,
}

export class Recenterer {
    private textEditor: TextEditor;
    private recenterPosition: RecenterPosition;

    constructor(textEditor: TextEditor) {
        this.textEditor = textEditor;
        this.recenterPosition = RecenterPosition.Middle;

        this.onDidChangeTextDocument = this.onDidChangeTextDocument.bind(this);
        vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument);
        this.onDidChangeTextEditorSelection = this.onDidChangeTextEditorSelection.bind(this);
        vscode.window.onDidChangeTextEditorSelection(this.onDidChangeTextEditorSelection);
    }

    public onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent) {
        // XXX: Is this a correct way to check the identity of document?
        if (e.document.uri.toString() === this.textEditor.document.uri.toString()) {
            this.reset();
        }
    }

    public onDidChangeTextEditorSelection(e: vscode.TextEditorSelectionChangeEvent) {
        if (new EditorIdentity(e.textEditor).isEqual(new EditorIdentity(this.textEditor))) {
            this.reset();
        }
    }

    public setTextEditor(textEditor: TextEditor) {
        this.textEditor = textEditor;
    }

    public recenterTopBottom() {
        switch (this.recenterPosition) {
            case RecenterPosition.Middle:
                this.textEditor.revealRange(this.textEditor.selection, TextEditorRevealType.InCenter);
                this.recenterPosition = RecenterPosition.Top;
                break;
            case RecenterPosition.Top:
                this.textEditor.revealRange(this.textEditor.selection, TextEditorRevealType.AtTop);
                this.recenterPosition = RecenterPosition.Bottom;
                break;
            case RecenterPosition.Bottom:
                // TextEditor.revealRange does not supprt to set the cursor at the bottom of window.
                // Therefore, the number of lines to scroll is calculated here.
                const current = this.textEditor.selection.active.line;
                const visibleTop = this.textEditor.visibleRanges[0].start.line;
                const visibleBottom = this.textEditor.visibleRanges[0].end.line;
                const visibleHeight = visibleBottom - visibleTop;

                const nextVisibleTop = Math.max(current - visibleHeight, 1);

                // Scroll so that `nextVisibleTop` is the top of window
                const p = new vscode.Position(nextVisibleTop, 0);
                const r = new vscode.Range(p, p);
                this.textEditor.revealRange(r);

                this.recenterPosition = RecenterPosition.Middle;
                break;
        }
    }

    public reset() {
        this.recenterPosition = RecenterPosition.Middle;
    }
}
