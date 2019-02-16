import { EmacsCommand } from ".";

export class EmacsCommandRegistry {
    private commands: Map<string, EmacsCommand>;

    constructor() {
        this.commands = new Map();
    }

    public register(command: EmacsCommand) {
        this.commands.set(command.id, command);
    }

    public get(commandName: string) {
        return this.commands.get(commandName);
    }
}
