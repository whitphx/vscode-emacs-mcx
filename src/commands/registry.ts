import { EmacsCommand, ITextEditorInterruptionHandler, isTextEditorInterruptionHandler } from ".";

export class EmacsCommandRegistry {
  private commands: Map<string, EmacsCommand>;
  private interruptionHandlers: ITextEditorInterruptionHandler[];

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
    return this.commands.get(commandName);
  }

  public onInterrupt(): void {
    for (const handler of this.interruptionHandlers) {
      handler.onDidInterruptTextEditor();
    }
  }
}
