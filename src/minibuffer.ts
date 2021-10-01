import vscode from "vscode";

interface ReadFromMinibufferOption {
  prompt: string;
}

export interface Minibuffer {
  readFromMinibuffer: (option: ReadFromMinibufferOption) => Promise<string | undefined>;
}

export class InputBoxMinibuffer implements Minibuffer {
  public async readFromMinibuffer(option: ReadFromMinibufferOption): Promise<string | undefined> {
    await this.setMinibufferReading(true);

    const inputBox = vscode.window.createInputBox();
    inputBox.title = option.prompt;
    inputBox.show();

    return new Promise<string | undefined>((resolve) => {
      let completed = false;
      inputBox.onDidAccept(() => {
        if (completed) return;
        completed = true;
        this.setMinibufferReading(false);

        const value = inputBox.value;
        inputBox.dispose();
        resolve(value);
      });
      inputBox.onDidHide(() => {
        if (completed) return;
        completed = true;
        this.setMinibufferReading(false);

        inputBox.dispose();
        resolve(undefined);
      });
    });
  }

  private setMinibufferReading(minibufferReading: boolean): Thenable<unknown> {
    return vscode.commands.executeCommand("setContext", "emacs-mcx.minibufferReading", minibufferReading);
  }
}
