/**
 * This file is derived from https://github.com/VSCodeVim/Vim/tree/104cf4779a221e951a90ef5daa1e5aa7a161b0f7
 */

import { IConfiguration } from "src/configuration/iconfiguration";

export interface ILogger {
  error(errorMessage: string): void;
  debug(debugMessage: string): void;
  warn(warnMessage: string): void;
  verbose(verboseMessage: string): void;
  configChanged(configuration: IConfiguration): void;
}
