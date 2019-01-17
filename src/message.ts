import * as vscode from "vscode";

/**
 * Shows emacs-like status bar message which disappears when any other command is invoked.
 */
export class MessageManager implements vscode.Disposable {
    private timeout: number;
    private disposable: vscode.Disposable | null = null;

    constructor(timeout: number = 10000) {
        this.timeout = timeout;

        this.onInterrupt = this.onInterrupt.bind(this);

        vscode.window.onDidChangeActiveTerminal(this.onInterrupt);
        vscode.window.onDidChangeActiveTextEditor(this.onInterrupt);
        vscode.window.onDidChangeTextEditorOptions(this.onInterrupt);
        vscode.window.onDidChangeTextEditorSelection(this.onInterrupt);
        vscode.window.onDidChangeTextEditorViewColumn(this.onInterrupt);
        vscode.window.onDidChangeTextEditorVisibleRanges(this.onInterrupt);
        vscode.window.onDidChangeVisibleTextEditors(this.onInterrupt);
        vscode.window.onDidChangeWindowState(this.onInterrupt);
        vscode.window.onDidCloseTerminal(this.onInterrupt);
        vscode.window.onDidOpenTerminal(this.onInterrupt);

        vscode.workspace.onDidChangeConfiguration(this.onInterrupt);
        vscode.workspace.onDidChangeTextDocument(this.onInterrupt);
        vscode.workspace.onDidChangeWorkspaceFolders(this.onInterrupt);
        vscode.workspace.onDidCloseTextDocument(this.onInterrupt);
        vscode.workspace.onDidOpenTextDocument(this.onInterrupt);
        vscode.workspace.onDidSaveTextDocument(this.onInterrupt);
        vscode.workspace.onWillSaveTextDocument(this.onInterrupt);
    }

    public onInterrupt() {
        if (this.disposable === null) {
            return;
        }

        this.disposable.dispose();
        delete this.disposable;
        this.disposable = null;
    }

    public showMessage(text: string) {
        this.disposable = vscode.window.setStatusBarMessage(text, this.timeout);
    }

    public dispose() {
        if (this.disposable !== null) {
            this.disposable.dispose();
        }
    }
}
