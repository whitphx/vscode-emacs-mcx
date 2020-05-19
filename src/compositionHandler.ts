import * as vscode from "vscode";

export class CompositionHandler {
  private firstTypeInCompositionOccured = false;
  private replacePreviousCharQueue: Array<any[]> = [];

  public async onCompositionStart(...args: any) {
    this.firstTypeInCompositionOccured = false;
    await vscode.commands.executeCommand("default:compositionStart", ...args);
  }

  public async onCompositionEnd(...args: any) {
    await this.flushQueuedReplacePreviousChars();
    await vscode.commands.executeCommand("default:compositionEnd", ...args);
  }

  public async onType(...args: any) {
    await vscode.commands.executeCommand("default:type", ...args);
    this.firstTypeInCompositionOccured = true;
  }

  public async onReplacePreviousChar(...args: any[]) {
    if (this.firstTypeInCompositionOccured) {
      await this.flushQueuedReplacePreviousChars();
      await vscode.commands.executeCommand("default:replacePreviousChar", ...args);
    } else {
      this.enqueueReplacePreviousChar(args);
    }
  }

  private async flushQueuedReplacePreviousChars() {
    for (;;) {
      const queuedArgs = this.replacePreviousCharQueue.shift();
      if (queuedArgs == null) {
        return;
      }
      await vscode.commands.executeCommand("default:replacePreviousChar", ...queuedArgs);
    }
  }

  private enqueueReplacePreviousChar(args: any[]) {
    this.replacePreviousCharQueue.push(args);

    // TODO: Is this necessary? sufficient?
    let retries = 3;
    const tryFlushQueuedReplacePreviousChars = () => {
      retries--;
      if (this.firstTypeInCompositionOccured) {
        this.flushQueuedReplacePreviousChars();
      } else if (retries >= 0) {
        setImmediate(tryFlushQueuedReplacePreviousChars);
      }
    };
    tryFlushQueuedReplacePreviousChars();
  }
}
