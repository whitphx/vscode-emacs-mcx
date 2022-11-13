/**
 * This file is derived from VSCodeVim/Vim.
 */

import { Logger } from "../logger";
import * as vscode from "vscode";
import { IConfiguration, IDebugConfiguration } from "./iconfiguration";

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

    // Disable forin rule here as we make accessors enumerable.`
    for (const option in this) {
      let val = emacsConfigs[option] as any;
      if (val !== null && val !== undefined) {
        if (val.constructor.name === Object.name) {
          val = Configuration.unproxify(val);
        }
        this[option] = val;
      }
    }

    Logger.configChanged(this);
  }

  private static unproxify(obj: { [key: string]: any }) {
    const result: { [key: string]: any } = {};
    for (const key in obj) {
      const val = obj[key];
      if (val !== null && val !== undefined) {
        result[key] = val;
      }
    }
    return result;
  }
}
