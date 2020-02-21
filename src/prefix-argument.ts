import { logger } from "./logger";
import { MessageManager } from "./message";

export class PrefixArgumentHandler {
  private isInPrefixArgumentMode = false;
  private isAcceptingPrefixArgument = false;
  private cuCount = 0; // How many C-u are input continuously
  private prefixArgumentStr = ""; // Prefix argument string input after C-u

  public handleType(text: string): boolean {
    if (!this.isInPrefixArgumentMode) {
      logger.debug(
        `[PrefixArgumentHandler.handleType]\t Not in prefix argument mode. exit.`
      );
      return false;
    }

    if (this.isAcceptingPrefixArgument && !isNaN(+text)) {
      // If `text` is a numeric charactor
      this.prefixArgumentStr += text;
      MessageManager.showMessage(`C-u ${this.prefixArgumentStr}-`);

      logger.debug(
        `[PrefixArgumentHandler.handleType]\t Prefix argument is "${this.prefixArgumentStr}"`
      );
      return true;
    }

    logger.debug(
      `[PrefixArgumentHandler.handleType]\t Prefix argument input is not accepted.`
    );
    return false;
  }

  /**
   * Emacs' ctrl-u
   */
  public universalArgument() {
    if (this.isInPrefixArgumentMode && this.prefixArgumentStr.length > 0) {
      logger.debug(
        `[PrefixArgumentHandler.universalArgument]\t Stop accepting prefix argument.`
      );
      this.isAcceptingPrefixArgument = false;
    } else {
      logger.debug(
        `[PrefixArgumentHandler.universalArgument]\t Start prefix argument or count up C-u.`
      );
      this.isInPrefixArgumentMode = true;
      this.isAcceptingPrefixArgument = true;
      this.cuCount++;
      this.prefixArgumentStr = "";
    }
  }

  public cancel() {
    logger.debug(`[PrefixArgumentHandler.cancel]`);
    this.isInPrefixArgumentMode = false;
    this.isAcceptingPrefixArgument = false;
    this.cuCount = 0;
    this.prefixArgumentStr = "";
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
}
