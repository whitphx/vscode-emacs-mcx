/**
 * This file is derived from VSCodeVim/Vim.
 */

import { Logger } from "../logger";
import * as vscode from "vscode";
import { IConfiguration, IDebugConfiguration, IPareditConfiguration } from "./iconfiguration";
import * as paredit from "paredit.js";
import { ILogger } from "../platform/common/logger";

export class Configuration implements IConfiguration, vscode.Disposable {
  /**
   * Configuration uses singleton pattern.
   */
  public static get instance(): Configuration {
    if (!this.inst) {
      this.inst = new Configuration();
    }

    return this.inst;
  }

  public static registerDispose(context: vscode.ExtensionContext): void {
    context.subscriptions.push(this.instance);
  }

  private static inst: Configuration;
  private static readonly logger: ILogger = Logger.get("Configuration");

  /**
   * Config fields
   */

  public killRingMax = 60;

  public markRingMax = 16;

  public strictEmacsMove = false;

  public killWholeLine = false;

  public enableOverridingTypeCommand = false;

  public lineMoveVisual = true;

  public paredit: IPareditConfiguration = {
    parentheses: { "[": "]", "(": ")", "{": "}" },
  };

  public debug: IDebugConfiguration = {
    silent: false,
    loggingLevelForAlert: "error",
    loggingLevelForConsole: "error",
  };

  public static reload(): void {
    this.instance.reload();
  }

  /**
   * Instance methods
   */

  private constructor() {
    this.reload();
  }

  public dispose(): void {
    // Now nothing to be done.
  }

  private reload() {
    const emacsConfigs = vscode.workspace.getConfiguration("emacs-mcx");

    try {
      // Disable forin rule here as we make accessors enumerable.
      for (const option in this) {
        let val = emacsConfigs[option] as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (val !== null && val !== undefined) {
          // Validate configuration values
          // Validate configuration values before assignment
          switch (option) {
            case "killRingMax":
            case "markRingMax":
              if (typeof val !== "number" || !Number.isInteger(val) || val <= 0) {
                throw new Error(`${option} must be a positive integer (got ${val})`);
              }
              break;
            case "strictEmacsMove":
            case "killWholeLine":
            case "enableOverridingTypeCommand":
            case "lineMoveVisual":
              if (typeof val !== "boolean") {
                throw new Error(`${option} must be a boolean (got ${typeof val})`);
              }
              break;
            case "paredit":
              if (typeof val !== "object" || val === null) {
                throw new Error("paredit configuration must be an object");
              }
              if (!val.parentheses || typeof val.parentheses !== "object") {
                throw new Error("paredit.parentheses must be an object mapping opening to closing brackets");
              }
              val = Configuration.unproxify(val);
              break;
            case "debug":
              if (typeof val !== "object" || val === null) {
                throw new Error("debug configuration must be an object");
              }
              if (typeof val.silent !== "boolean") {
                throw new Error("debug.silent must be a boolean");
              }
              if (!["error", "warn", "info", "debug"].includes(val.loggingLevelForAlert)) {
                throw new Error("debug.loggingLevelForAlert must be one of: error, warn, info, debug");
              }
              if (!["error", "warn", "info", "debug"].includes(val.loggingLevelForConsole)) {
                throw new Error("debug.loggingLevelForConsole must be one of: error, warn, info, debug");
              }
              val = Configuration.unproxify(val);
              break;
          }
          this[option] = val;
        }
      }

      Logger.configChanged(this);

      // Update configs in the third-party libraries.
      paredit.reader.setParentheses(this.paredit.parentheses);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown configuration error";
      Configuration.logger.error(`Configuration error: ${message}`);
      // Rethrow the error after logging it
      throw error;
    }
  }

  private static unproxify(obj: { [key: string]: unknown }) {
    const result: { [key: string]: unknown } = {};
    for (const key in obj) {
      const val = obj[key];
      if (val !== null && val !== undefined) {
        result[key] = val;
      }
    }
    return result;
  }
}
