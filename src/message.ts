import * as vscode from "vscode";

/**
 * Shows emacs-like status bar message which disappears when any other command is invoked.
 */
export class MessageManager implements vscode.Disposable {
  /**
   * MessageManager uses singleton pattern.
   */
  public static get instance(): MessageManager {
    if (!this.inst) {
      this.inst = new MessageManager();
    }

    return this.inst;
  }

  public static registerDispose(context: vscode.ExtensionContext): void {
    context.subscriptions.push(this.instance);
  }

  public static showMessage(text: string): void {
    this.instance.showMessage(text);
  }

  public static removeMessage(): void {
    this.instance.removeMessage();
  }

  private static inst: MessageManager;

  private timeout: number;
  private messageDisposable: vscode.Disposable | null = null;

  private disposables: vscode.Disposable[] = [];

  private constructor(timeout = 10000) {
    this.timeout = timeout;

    this.onInterrupt = this.onInterrupt.bind(this);

    vscode.window.onDidChangeActiveTerminal(this.onInterrupt, this, this.disposables);
    vscode.window.onDidChangeActiveTextEditor(this.onInterrupt, this, this.disposables);
    vscode.window.onDidChangeTextEditorOptions(this.onInterrupt, this, this.disposables);
    vscode.window.onDidChangeTextEditorSelection(this.onInterrupt, this, this.disposables);
    vscode.window.onDidChangeTextEditorViewColumn(this.onInterrupt, this, this.disposables);
    vscode.window.onDidChangeTextEditorVisibleRanges(this.onInterrupt, this, this.disposables);
    vscode.window.onDidChangeVisibleTextEditors(this.onInterrupt, this, this.disposables);
    vscode.window.onDidChangeWindowState(this.onInterrupt, this, this.disposables);
    vscode.window.onDidCloseTerminal(this.onInterrupt, this, this.disposables);
    vscode.window.onDidOpenTerminal(this.onInterrupt, this, this.disposables);

    vscode.workspace.onDidChangeConfiguration(this.onInterrupt, this, this.disposables);
    vscode.workspace.onDidChangeTextDocument(this.onInterrupt, this, this.disposables);
    vscode.workspace.onDidChangeWorkspaceFolders(this.onInterrupt, this, this.disposables);
    vscode.workspace.onDidCloseTextDocument(this.onInterrupt, this, this.disposables);
    vscode.workspace.onDidOpenTextDocument(this.onInterrupt, this, this.disposables);
    vscode.workspace.onDidSaveTextDocument(this.onInterrupt, this, this.disposables);
    vscode.workspace.onWillSaveTextDocument(this.onInterrupt, this, this.disposables);
  }

  public onInterrupt(): void {
    if (this.messageDisposable === null) {
      return;
    }

    this.messageDisposable.dispose();
    this.messageDisposable = null;
  }

  public showMessage(text: string): void {
    if (this.messageDisposable) {
      this.messageDisposable.dispose();
    }
    this.messageDisposable = vscode.window.setStatusBarMessage(text, this.timeout);
  }

  public removeMessage(): void {
    if (this.messageDisposable !== null) {
      this.messageDisposable.dispose();
    }
  }

  public dispose(): void {
    if (this.messageDisposable !== null) {
      this.messageDisposable.dispose();
    }

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
