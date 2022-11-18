import { EmacsCommand } from ".";

export class EmacsCommandRegistry {
  private commands: Map<string, EmacsCommand>;

  constructor() {
    this.commands = new Map();
  }

  public register(command: EmacsCommand): void {
    this.commands.set(command.id, command);
  }

  public get(commandName: string): EmacsCommand | undefined {
    return this.commands.get(commandName);
  }

  public forEach(
    callbackfn: (value: EmacsCommand, key: string, map: Map<string, EmacsCommand>) => void,
    thisArg?: unknown
  ): void {
    this.commands.forEach(callbackfn, thisArg);
  }
}
