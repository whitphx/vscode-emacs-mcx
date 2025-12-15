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

  public static async withMessageDefer<T>(innerFn: () => T): Promise<Awaited<T>> {
    this.instance.startDeferringMessage();
    try {
      const res = await innerFn();
      return res;
    } finally {
      this.instance.showDeferredMessage();
    }
  }

  public static showMessage(text: string): void {
    this.instance.showMessage(text);
  }

  public static showMessageImmediately(text: string): void {
    this.instance.showMessageImmediately(text);
  }

  public static removeMessage(): void {
    this.instance.removeMessage();
  }

  private static inst: MessageManager | undefined;

  private timeout: number;
  private messageDisposable: vscode.Disposable | null = null;

  private disposables: vscode.Disposable[] = [];

  private constructor(timeout = 10000) {
    this.timeout = timeout;

    this.onInterrupt = this.onInterrupt.bind(this);

    vscode.window.onDidChangeActiveTerminal(this.onInterrupt, this, this.disposables);
    vscode.window.onDidChangeActiveTextEditor(this.onInterrupt, this, this.disposables);
    vscode.window.onDidChangeTextEditorSelection(this.onInterrupt, this, this.disposables);
    vscode.window.onDidChangeTextEditorViewColumn(this.onInterrupt, this, this.disposables);
    vscode.window.onDidChangeTextEditorVisibleRanges(this.onInterrupt, this, this.disposables);
    vscode.window.onDidChangeVisibleTextEditors(this.onInterrupt, this, this.disposables);
    // vscode.window.onDidChangeWindowState(this.onInterrupt, this, this.disposables); // Emacs doesn't interrupt on window focus change.
    vscode.window.onDidCloseTerminal(this.onInterrupt, this, this.disposables);
    vscode.window.onDidOpenTerminal(this.onInterrupt, this, this.disposables);

    vscode.workspace.onDidChangeTextDocument(this.onInterrupt, this, this.disposables);
    vscode.workspace.onDidCloseTextDocument(this.onInterrupt, this, this.disposables);
    vscode.workspace.onDidOpenTextDocument(this.onInterrupt, this, this.disposables);
    vscode.workspace.onDidSaveTextDocument(this.onInterrupt, this, this.disposables);
  }

  public onInterrupt = (): void => {
    if (this.messageDisposable === null) {
      return;
    }

    this.messageDisposable.dispose();
    this.messageDisposable = null;
  };

  private isDeferringMessage = false;
  private deferredMessage: string | null = null;

  public startDeferringMessage(): void {
    this.isDeferringMessage = true;
  }

  public showDeferredMessage(): void {
    this.isDeferringMessage = false;
    if (this.deferredMessage != null) {
      const message = this.deferredMessage;
      this.deferredMessage = null;
      setTimeout(() => {
        this.showMessageImmediately(message);
      }, 1000 / 30);
    }
  }

  public showMessage(text: string): void {
    if (this.isDeferringMessage) {
      this.deferMessage(text);
    } else {
      this.showMessageImmediately(text);
    }
  }

  public deferMessage(text: string): void {
    this.deferredMessage = text;
  }

  public showMessageImmediately(text: string): void {
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

    MessageManager.inst = undefined;
  }
}
