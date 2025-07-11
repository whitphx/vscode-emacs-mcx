/**
 * This file is derived from VSCodeVim/Vim.
 */

import { Logger } from "../logger";
import * as vscode from "vscode";
import { IConfiguration, IDebugConfiguration, IPareditConfiguration } from "./iconfiguration";
import * as paredit from "paredit.js";

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

    for (const option of Object.keys(this)) {
      let val: unknown = emacsConfigs[option];
      if (val != null) {
        if (typeof val === "object" && val != null) {
          val = Configuration.unproxify(val as Record<string, unknown>);
        }
        // @ts-expect-error Type unsafe
        this[option] = val;
      }
    }

    Logger.configChanged(this);

    // Update configs in the third-party libraries.
    paredit.reader.setParentheses(this.paredit.parentheses);
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
