import vscode from "vscode";
import { logger } from "./logger";

interface ReadFromMinibufferOption {
  prompt: string;
}

export interface Minibuffer {
  readonly isReading: boolean;
  paste: (text: string) => void;
  readFromMinibuffer: (option: ReadFromMinibufferOption) => Promise<string | undefined>;
}

export class InputBoxMinibuffer implements Minibuffer {
  private inputBox: vscode.InputBox | undefined;

  constructor() {
    this.inputBox = undefined;
  }

  public get isReading(): boolean {
    return this.inputBox != null && this.inputBox.enabled && !this.inputBox.busy;
  }

  public paste(text: string): void {
    if (!this.isReading || this.inputBox == null || !this.inputBox.enabled) {
      logger.warn("Minibuffer is not active.");
      return;
    }

    if (this.inputBox.busy) {
      logger.warn("Minibuffer is busy");
      return;
    }

    this.inputBox.value = this.inputBox.value + text; // XXX: inputBox cannot get the cursor position, so the pasted text can only be appended to the tail.
  }

  public async readFromMinibuffer(option: ReadFromMinibufferOption): Promise<string | undefined> {
    await this.setMinibufferReading(true);

    const inputBox = vscode.window.createInputBox();
    this.inputBox = inputBox;
    inputBox.title = option.prompt;
    inputBox.show();

    const dispose = () => {
      this.setMinibufferReading(false);
      inputBox.dispose();
      this.inputBox = undefined;
    };

    return new Promise<string | undefined>((resolve) => {
      let completed = false;
      inputBox.onDidAccept(() => {
        if (completed) return;
        completed = true;

        const value = inputBox.value;
        dispose();
        resolve(value);
      });
      inputBox.onDidHide(() => {
        if (completed) return;
        completed = true;

        dispose();
        resolve(undefined);
      });
    });
  }

  private setMinibufferReading(minibufferReading: boolean): Thenable<unknown> {
    return vscode.commands.executeCommand("setContext", "emacs-mcx.minibufferReading", minibufferReading);
  }
}
