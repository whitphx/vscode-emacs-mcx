import { EmacsCommand, ITextEditorInterruptionHandler, isTextEditorInterruptionHandler } from ".";

export class EmacsCommandRegistry {
  private commands: Map<string, EmacsCommand>;
  private interruptionHandlers: ITextEditorInterruptionHandler[];
  private lastExecutedCommandId?: string;
  private currentCommandId?: string;

  constructor() {
    this.commands = new Map();
    this.interruptionHandlers = [];
  }

  public register(command: EmacsCommand): void {
    this.commands.set(command.id, command);
    if (isTextEditorInterruptionHandler(command)) {
      this.interruptionHandlers.push(command);
    }
  }

  public get(commandName: string): EmacsCommand | undefined {
    const command = this.commands.get(commandName);
    if (command) {
      this.lastExecutedCommandId = commandName;
      this.currentCommandId = commandName;
      // Reset currentCommandId after command execution
      setTimeout(() => {
        this.currentCommandId = undefined;
      }, 0);
    }
    return command;
  }

  public getCurrentCommandId(): string | undefined {
    // Return the current command ID if it exists, otherwise return the last executed command
    // This helps track command context during document changes that happen after command execution
    return this.currentCommandId || this.lastExecutedCommandId;
  }

  public onInterrupt(): void {
    const currentCommandId = this.lastExecutedCommandId;
    for (const handler of this.interruptionHandlers) {
      handler.onDidInterruptTextEditor(currentCommandId);
    }
  }
}
