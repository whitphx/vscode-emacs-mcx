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
    }
    return command;
  }

  public getCurrentCommandId(): string | undefined {
    return this.lastExecutedCommandId;
  }

  public onInterrupt(): void {
    const currentCommandId = this.lastExecutedCommandId;
    for (const handler of this.interruptionHandlers) {
      handler.onDidInterruptTextEditor(currentCommandId);
    }
  }
}
