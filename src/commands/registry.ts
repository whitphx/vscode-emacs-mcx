import { isTextEditorInterruptionHandler } from ".";
import type { EmacsCommand, ITextEditorInterruptionHandler, InterruptEvent } from ".";

export class EmacsCommandRegistry {
  private commands: Map<string, EmacsCommand>;
  private interruptionHandlers: ITextEditorInterruptionHandler[];

  constructor() {
    this.commands = new Map();
    this.interruptionHandlers = [];
  }

  public register(id: string, command: EmacsCommand): void {
    this.commands.set(id, command);
    if (isTextEditorInterruptionHandler(command)) {
      this.interruptionHandlers.push(command);
    }
  }

  public get(commandName: string): EmacsCommand | undefined {
    return this.commands.get(commandName);
  }

  public onInterrupt(event: InterruptEvent): void {
    for (const handler of this.interruptionHandlers) {
      handler.onDidInterruptTextEditor(event);
    }
  }
}
