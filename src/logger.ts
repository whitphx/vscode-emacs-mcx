/**
 * This file is derived from VSCodeVim/Vim.
 */

import * as vscode from "vscode";
import * as winston from "winston";
import { ConsoleForElectron } from "winston-console-for-electron";
import * as TransportStream from "winston-transport";
import { IConfiguration } from "./configuration/iconfiguration";

/**
 * Implementation of Winston transport
 * Displays VS Code message to user
 */
class VsCodeMessage extends TransportStream {
  public log(info: { level: string; message: string }, callback: () => void) {
    switch (info.level) {
      case "error":
        vscode.window.showErrorMessage(info.message, "Dismiss");
        break;
      case "warn":
        vscode.window.showWarningMessage(info.message, "Dismiss");
        break;
      case "info":
      case "verbose":
      case "debug":
        vscode.window.showInformationMessage(info.message, "Dismiss");
        break;
    }

    if (callback) {
      callback();
    }
  }
}

export let logger = winston.createLogger({
  format: winston.format.simple(),
  transports: [
    new ConsoleForElectron({
      level: "error",
      silent: false
    }),
    new VsCodeMessage({
      level: "error",
      silent: false
    })
  ]
});

export function initializeLogger(configuration: IConfiguration) {
  logger = winston.createLogger({
    format: winston.format.simple(),
    transports: [
      new ConsoleForElectron({
        level: configuration.debug.loggingLevelForConsole,
        silent: configuration.debug.silent
      }),
      new VsCodeMessage({
        level: configuration.debug.loggingLevelForAlert,
        silent: configuration.debug.silent
      })
    ]
  });
}
