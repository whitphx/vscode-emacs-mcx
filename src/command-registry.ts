import { isTextEditorInterruptionHandler } from "./commands";
import type { EmacsCommand, ITextEditorInterruptionHandler, InterruptEvent } from "./commands";

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

  public onInterrupt(event: InterruptEvent): void {
    for (const handler of this.interruptionHandlers) {
      handler.onDidInterruptTextEditor(event);
    }
  }
}
