import { logger } from "./logger";
import { MessageManager } from "./message";

interface PrefixArgumentHandlerState {
  isInPrefixArgumentMode: boolean;
  isAcceptingPrefixArgument: boolean;
  cuCount: number; // How many C-u are input continuously
  prefixArgumentStr: string; // Prefix argument string input after C-u
}

export class PrefixArgumentHandler {
  private state: PrefixArgumentHandlerState;
  private onPrefixArgumentChange: (newPrefixArgument: number | undefined) => Thenable<unknown>;
  private onAcceptingStateChange: (newState: boolean) => Thenable<unknown>;

  public constructor(
    onPrefixArgumentChange: (newPrefixArgument: number | undefined) => Thenable<unknown>,
    onAcceptingStateChange: (newState: boolean) => Thenable<unknown>
  ) {
    this.state = {
      isInPrefixArgumentMode: false,
      isAcceptingPrefixArgument: false,
      cuCount: 0,
      prefixArgumentStr: "",
    };
    this.onPrefixArgumentChange = onPrefixArgumentChange;
    this.onAcceptingStateChange = onAcceptingStateChange;
  }

  private updateState(newState: Partial<PrefixArgumentHandlerState>): Promise<unknown> {
    const oldState = this.state;
    this.state = {
      ...this.state,
      ...newState,
    };
    const acceptingStateChanged = oldState.isAcceptingPrefixArgument !== this.state.isAcceptingPrefixArgument;
    const prefixArgumentChanged =
      oldState.isInPrefixArgumentMode !== this.state.isInPrefixArgumentMode ||
      oldState.prefixArgumentStr !== this.state.prefixArgumentStr ||
      oldState.cuCount !== this.state.cuCount;

    const promises = [];
    if (acceptingStateChanged) {
      const promise = this.onAcceptingStateChange(this.state.isAcceptingPrefixArgument);
      promises.push(promise);
    }
    if (prefixArgumentChanged) {
      const promise = this.onPrefixArgumentChange(this.getPrefixArgument());
      promises.push(promise);
    }

    return Promise.all(promises);
  }

  public appendPrefixArgumentStr(text: string): Promise<unknown> {
    const promise = this.updateState({
      prefixArgumentStr: this.state.prefixArgumentStr + text,
    });
    MessageManager.showMessage(`C-u ${this.state.prefixArgumentStr}-`);
    return promise;
  }

  public universalArgumentDigit(arg: number): Promise<unknown> {
    if (!this.state.isInPrefixArgumentMode) {
      logger.debug(`[PrefixArgumentHandler.handleType]\t Not in prefix argument mode. exit.`);
      return Promise.resolve();
    }

    if (!this.state.isAcceptingPrefixArgument) {
      logger.debug(`[PrefixArgumentHandler.handleType]\t Prefix argument input is not accepted.`);
      return Promise.resolve();
    }

    if (isNaN(arg) || arg < 0) {
      logger.debug(`[PrefixArgumentHandler.handleType]\t Input digit is NaN or negative. Ignore it.`);
      return Promise.resolve();
    }

    const text = arg.toString();
    return this.appendPrefixArgumentStr(text);
  }

  public handleType(text: string): boolean {
    if (!this.state.isInPrefixArgumentMode) {
      logger.debug(`[PrefixArgumentHandler.handleType]\t Not in prefix argument mode. exit.`);
      return false;
    }

    if (this.state.isAcceptingPrefixArgument && !isNaN(+text)) {
      // If `text` is a numeric charactor
      this.appendPrefixArgumentStr(text);

      logger.debug(`[PrefixArgumentHandler.handleType]\t Prefix argument is "${this.state.prefixArgumentStr}"`);
      return true;
    }

    logger.debug(`[PrefixArgumentHandler.handleType]\t Prefix argument input is not accepted.`);
    return false;
  }

  /**
   * Emacs' ctrl-u
   */
  public universalArgument(): Promise<unknown> {
    if (this.state.isInPrefixArgumentMode && this.state.prefixArgumentStr.length > 0) {
      logger.debug(`[PrefixArgumentHandler.universalArgument]\t Stop accepting prefix argument.`);
      return this.updateState({
        isAcceptingPrefixArgument: false,
      });
    } else {
      logger.debug(`[PrefixArgumentHandler.universalArgument]\t Start prefix argument or count up C-u.`);
      return this.updateState({
        isInPrefixArgumentMode: true,
        isAcceptingPrefixArgument: true,
        cuCount: this.state.cuCount + 1,
        prefixArgumentStr: "",
      });
    }
  }

  public cancel(): Promise<unknown> {
    logger.debug(`[PrefixArgumentHandler.cancel]`);
    return this.updateState({
      isInPrefixArgumentMode: false,
      isAcceptingPrefixArgument: false,
      cuCount: 0,
      prefixArgumentStr: "",
    });
  }

  public getPrefixArgument(): number | undefined {
    if (!this.state.isInPrefixArgumentMode) {
      return undefined;
    }

    const prefixArgument = parseInt(this.state.prefixArgumentStr, 10);
    if (isNaN(prefixArgument)) {
      return 4 ** this.state.cuCount;
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
    return this.state.isInPrefixArgumentMode && this.state.cuCount === 1;
  }
}
