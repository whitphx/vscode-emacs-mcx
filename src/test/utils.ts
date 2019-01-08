import * as assert from "assert";
import * as vscode from "vscode";
import {Position, Range, TextEditor} from "vscode";

export async function setupWorkspace(initialText: string = ""): Promise<vscode.TextEditor> {
    const doc = await vscode.workspace.openTextDocument({
        content: initialText,
        language: "text",
    });

    await vscode.window.showTextDocument(doc);

    const activeTextEditor = vscode.window.activeTextEditor;
    assert.ok(activeTextEditor);

    return activeTextEditor!;
}

export async function clearTextEditor(textEditor: vscode.TextEditor, initializeWith: string = "") {
    const doc = textEditor.document;
    await textEditor.edit((editBuilder) => {
        editBuilder.delete(new Range(
            new Position(0, 0),
            doc.positionAt(doc.getText().length),
        ));
    });
    await textEditor.edit((editBuilder) => {
        editBuilder.insert(
            new Position(0, 0),
            initializeWith,
        );
    });
    assert.equal(doc.getText(), initializeWith);
}

export async function cleanUpWorkspace() {
}

export function assertTextEqual(textEditor: TextEditor, expectedText: string) {
    assert.equal(textEditor.document.getText(), expectedText);
}
