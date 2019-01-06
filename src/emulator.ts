import { Disposable, TextEditor } from "vscode";

export class EmacsEmulator implements Disposable {
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

    public cancel() {
        // TODO
        console.log("Cancel");
    }

    public dispose() {
        // TODO
    }
}
