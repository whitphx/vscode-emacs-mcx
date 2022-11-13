import * as vscode from "vscode";

export class EditorIdentity {
  private _fileName: string;

  constructor(textEditor?: vscode.TextEditor) {
    this._fileName = (textEditor && textEditor.document && textEditor.document.fileName) || "";
  }

  get fileName(): string {
    return this._fileName;
  }

  public isEqual(other: EditorIdentity): boolean {
    return this.fileName === other.fileName;
  }

  public toString(): string {
    return this.fileName;
  }
}
