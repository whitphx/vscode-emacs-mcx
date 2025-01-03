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

  private _killRingMax = 60;
  public get killRingMax(): number {
    const config = vscode.workspace.getConfiguration("emacs-mcx");
    const val = config && typeof config.get === "function" ? config.get("killRingMax") : undefined;

    if (val !== undefined) {
      if (typeof val !== "number" || !Number.isInteger(val) || val <= 0) {
        const error = new Error(`killRingMax must be a positive integer (got ${val})`);
        Configuration.logger.warn(`Error accessing killRingMax configuration: ${error.message}`);
        throw error;
      }
      return val;
    }
    return this._killRingMax;
  }

  public markRingMax = 16;

  public strictEmacsMove = false;

  public killWholeLine = false;

  public enableOverridingTypeCommand = false;

  public lineMoveVisual = true;

  public paredit: IPareditConfiguration = {
    parentheses: { "[": "]", "(": ")", "{": "}" },
  };

  private _debug: IDebugConfiguration = {
    silent: false,
    loggingLevelForAlert: "error",
    loggingLevelForConsole: "error",
  };
  public get debug(): IDebugConfiguration {
    const config = vscode.workspace.getConfiguration("emacs-mcx");
    const val = config && typeof config.get === "function" ? config.get("debug") : undefined;

    if (val !== undefined) {
      if (typeof val !== "object" || val === null) {
        const error = new Error("debug configuration must be an object");
        Configuration.logger.warn(`Error accessing debug configuration: ${error.message}`);
        throw error;
      }

      const debugConfig = val as {
        silent?: unknown;
        loggingLevelForAlert?: unknown;
        loggingLevelForConsole?: unknown;
      };

      if (typeof debugConfig.silent !== "boolean") {
        const error = new Error("debug.silent must be a boolean");
        Configuration.logger.warn(`Error accessing debug configuration: ${error.message}`);
        throw error;
      }

      const validLogLevels = ["error", "warn", "info", "debug"];
      if (!validLogLevels.includes(debugConfig.loggingLevelForAlert as string)) {
        const error = new Error("debug.loggingLevelForAlert must be one of: error, warn, info, debug");
        Configuration.logger.warn(`Error accessing debug configuration: ${error.message}`);
        throw error;
      }
      if (!validLogLevels.includes(debugConfig.loggingLevelForConsole as string)) {
        const error = new Error("debug.loggingLevelForConsole must be one of: error, warn, info, debug");
        Configuration.logger.warn(`Error accessing debug configuration: ${error.message}`);
        throw error;
      }

      return {
        silent: debugConfig.silent,
        loggingLevelForAlert: debugConfig.loggingLevelForAlert as "error" | "warn" | "info" | "debug",
        loggingLevelForConsole: debugConfig.loggingLevelForConsole as "error" | "warn" | "info" | "debug",
      };
    }
    return this._debug;
  }

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
