import * as vscode from "vscode";

export async function executeCommands(commands: string[]) {
  const promises = commands.map((command) => vscode.commands.executeCommand(command));
  for (const promise of promises) {
    await promise;
  }
}
