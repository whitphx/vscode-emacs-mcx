import { logger } from "./logger";
import { MessageManager } from "./message";

export class PrefixArgumentHandler {
  private isInPrefixArgumentMode = false;
  private isAcceptingPrefixArgument = false;
  private cuCount = 0; // How many C-u are input continuously
  private prefixArgumentStr = ""; // Prefix argument string input after C-u
  private onPrefixArgumentChange: (newPrefixArgument: number | undefined) => void;
  private onAcceptingStateChange: (newState: boolean) => void;

  public constructor(
    onPrefixArgumentChange: (newPrefixArgument: number | undefined) => void,
    onAcceptingStateChange: (newState: boolean) => void
  ) {
    this.onPrefixArgumentChange = onPrefixArgumentChange;
    this.onAcceptingStateChange = onAcceptingStateChange;
  }

  public appendPrefixArgumentStr(text: string): void {
    this.prefixArgumentStr += text;
    MessageManager.showMessage(`C-u ${this.prefixArgumentStr}-`);
    this.callOnPrefixArgumentChange();
  }

  public universalArgumentDigit(arg: number): boolean {
    if (!this.isInPrefixArgumentMode) {
      logger.debug(`[PrefixArgumentHandler.handleType]\t Not in prefix argument mode. exit.`);
      return false;
    }

    if (!this.isAcceptingPrefixArgument) {
      logger.debug(`[PrefixArgumentHandler.handleType]\t Prefix argument input is not accepted.`);
      return false;
    }

    if (isNaN(arg) || arg < 0) {
      logger.debug(`[PrefixArgumentHandler.handleType]\t Input digit is NaN or negative. Ignore it.`);
      return false;
    }

    const text = arg.toString();
    this.appendPrefixArgumentStr(text);
    return true;
  }

  public handleType(text: string): boolean {
    if (!this.isInPrefixArgumentMode) {
      logger.debug(`[PrefixArgumentHandler.handleType]\t Not in prefix argument mode. exit.`);
      return false;
    }

    if (this.isAcceptingPrefixArgument && !isNaN(+text)) {
      // If `text` is a numeric charactor
      this.appendPrefixArgumentStr(text);

      logger.debug(`[PrefixArgumentHandler.handleType]\t Prefix argument is "${this.prefixArgumentStr}"`);
      return true;
    }

    logger.debug(`[PrefixArgumentHandler.handleType]\t Prefix argument input is not accepted.`);
    return false;
  }

  /**
   * Emacs' ctrl-u
   */
  public universalArgument() {
    if (this.isInPrefixArgumentMode && this.prefixArgumentStr.length > 0) {
      logger.debug(`[PrefixArgumentHandler.universalArgument]\t Stop accepting prefix argument.`);
      this.isAcceptingPrefixArgument = false;
      this.callOnAcceptingStateChange();
      this.callOnPrefixArgumentChange();
    } else {
      logger.debug(`[PrefixArgumentHandler.universalArgument]\t Start prefix argument or count up C-u.`);
      this.isInPrefixArgumentMode = true;
      this.isAcceptingPrefixArgument = true;
      this.cuCount++;
      this.prefixArgumentStr = "";
      this.callOnAcceptingStateChange();
      this.callOnPrefixArgumentChange();
    }
  }

  public cancel() {
    logger.debug(`[PrefixArgumentHandler.cancel]`);
    this.isInPrefixArgumentMode = false;
    this.isAcceptingPrefixArgument = false;
    this.cuCount = 0;
    this.prefixArgumentStr = "";
    this.callOnAcceptingStateChange();
    this.callOnPrefixArgumentChange();
  }

  public getPrefixArgument(): number | undefined {
    if (!this.isInPrefixArgumentMode) {
      return undefined;
    }

    const prefixArgument = parseInt(this.prefixArgumentStr, 10);
    if (isNaN(prefixArgument)) {
      return 4 ** this.cuCount;
    }
    return prefixArgument;
  }

  /**
   * This can be used to detect keyboard inputs starting with C-u.
   * Since C-u is assigned to universal-argument,
   * all multi-key keybindings starting with C-u can't be detected by VSCode
   * and have to be handled by this extension in its own way.
   */
  public precedingSingleCtrlU(): boolean {
    return this.isInPrefixArgumentMode && this.cuCount === 1;
  }

  private callOnAcceptingStateChange() {
    this.onAcceptingStateChange(this.isAcceptingPrefixArgument);
  }

  private callOnPrefixArgumentChange() {
    this.onPrefixArgumentChange(this.getPrefixArgument());
  }
}
