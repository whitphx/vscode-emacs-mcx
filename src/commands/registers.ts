import * as vscode from "vscode";
import { EmacsCommand, IEmacsCommandInterrupted } from ".";

// Will bind this this to C-x r s
export class StartRegisterSaveCommand extends EmacsCommand implements IEmacsCommandInterrupted {
  public readonly id = "StartRegisterSaveCommand";

  private acceptingRegisterSaveCommand = false;

  private startRegisterSaveCommand(): void {
    this.acceptingRegisterSaveCommand = true;
    vscode.commands.executeCommand("setContext", "emacs-mcx.inRegisterSaveMode", true);
  }

  private stopRegisterSaveCommand(): void {
    this.acceptingRegisterSaveCommand = false;
    vscode.commands.executeCommand("setContext", "emacs-mcx.inRegisterSaveMode", false);
  }

  public execute(): void {
    this.startRegisterSaveCommand();
  }

  public onDidInterruptTextEditor(): void {
    if (this.acceptingRegisterSaveCommand) {
      this.stopRegisterSaveCommand();
    }
  }
}

// Will bind this this to C-x r i
export class StartRegisterInsertCommand extends EmacsCommand implements IEmacsCommandInterrupted {
  public readonly id = "StartRegisterInsertCommand";

  private acceptingRegisterInsertCommand = false;

  public startRegisterInsertCommand(): void {
    this.acceptingRegisterInsertCommand = true;
    vscode.commands.executeCommand("setContext", "emacs-mcx.inRegisterInsertMode", true);
  }

  private stopRegisterInsertCommand(): void {
    this.acceptingRegisterInsertCommand = false;
    vscode.commands.executeCommand("setContext", "emacs-mcx.inRegisterInsertMode", false);
  }

  public execute(): void {
    this.startRegisterInsertCommand();
  }

  public onDidInterruptTextEditor(): void {
    if (this.acceptingRegisterInsertCommand) {
      this.stopRegisterInsertCommand();
    }
  }
}
