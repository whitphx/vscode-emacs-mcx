export interface IDebugConfiguration {
    /**
     * Boolean indicating whether all logs should be suppressed
     * This value overrides both `loggingLevelForAlert` and `loggingLevelForConsole`
     */
    silent: boolean;

    /**
     * Maximum level of messages to show as VS Code information message
     * Supported values: ['error', 'warn', 'info', 'verbose', 'debug', 'silly']
     */
    loggingLevelForAlert: string;

    /**
     * Maximum level of messages to log to console.
     * Supported values: ['error', 'warn', 'info', 'verbose', 'debug', 'silly']
     */
    loggingLevelForConsole: string;
}

export interface IConfiguration {
    killRingMax: number;

    /**
     * Extension debugging settings
     */
    debug: IDebugConfiguration;
}
