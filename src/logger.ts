import { ILogger } from "src/platform/common/logger";
import { LoggerImpl } from "platform/loggerImpl";
import { IConfiguration } from "src/configuration/iconfiguration";

export class Logger {
  private static readonly cache = new Map<string, ILogger>();
  private static configuration: IConfiguration | undefined = undefined;

  static get(prefix: string): ILogger {
    let logger = Logger.cache.get(prefix);
    if (logger === undefined) {
      logger = LoggerImpl.get(prefix);
      if (Logger.configuration) {
        logger.configChanged(Logger.configuration);
      }
      Logger.cache.set(prefix, logger);
    }

    return logger;
  }

  static configChanged(configuration: IConfiguration): void {
    Logger.configuration = configuration;
    for (const logger of this.cache.values()) {
      logger.configChanged(configuration);
    }
  }
}

export const logger = Logger.get(""); // Default logger, which is not recommended to use. Prefixed loggers should be used instead.
