/**
 * This file is derived from https://github.com/VSCodeVim/Vim/tree/104cf4779a221e951a90ef5daa1e5aa7a161b0f7
 */

import { IConfiguration } from "../../configuration/iconfiguration";
import { ILogger } from "src/platform/common/logger";

const logPriorities: string[] = ["error", "warn", "info", "verbose", "debug", "silly"];

/**
 * Displays VSCode message to user
 */
export class VsCodeMessage implements ILogger {
  actionMessages = ["Dismiss", "Suppress Errors"];
  private prefix: string;
  configuration?: IConfiguration;
  priorityThreshold: number;

  constructor(prefix: string) {
    this.prefix = prefix;
    this.priorityThreshold = -1;
  }

  error(errorMessage: string): void {
    this.log({ level: "error", message: errorMessage });
  }

  debug(debugMessage: string): void {
    this.log({ level: "debug", message: debugMessage });
  }

  warn(warnMessage: string): void {
    this.log({ level: "warn", message: warnMessage });
  }

  verbose(verboseMessage: string): void {
    this.log({ level: "verbose", message: verboseMessage });
  }

  private isSevere(logLevel: string): boolean {
    const priority = logPriorities.indexOf(logLevel);
    if (priority < 0 || this.priorityThreshold < 0) {
      return true; // Unexpected severity is considered severe tentatively.
    }

    return priority <= this.priorityThreshold;
  }

  private log(info: { level: string; message: string }) {
    if (this.configuration && this.configuration.debug.silent) {
      return;
    }

    if (!this.isSevere(info.level)) {
      return;
    }

    let showMessage: (message: string, ...items: string[]) => void;
    switch (info.level) {
      case "error":
        showMessage = console.error;
        break;
      case "warn":
        showMessage = console.warn;
        break;
      case "info":
        showMessage = console.log;
        break;
      case "verbose":
      case "debug":
        showMessage = console.debug;
        break;
      default:
        throw Error(`Unsupported log level ${info.level}`);
    }

    showMessage(`${this.prefix}: ${info.message}`, ...this.actionMessages);
  }

  public configChanged(configuration: IConfiguration): void {
    this.configuration = configuration;
    this.priorityThreshold = logPriorities.indexOf(this.configuration?.debug.loggingLevelForConsole);
  }
}

export class LoggerImpl {
  static get(prefix: string): ILogger {
    return new VsCodeMessage(prefix);
  }
}
