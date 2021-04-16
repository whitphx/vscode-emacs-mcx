import * as vscode from "vscode";

export async function executeCommands(commands: string[]): Promise<void> {
  await Promise.all(commands.map((command) => vscode.commands.executeCommand(command)));
}
