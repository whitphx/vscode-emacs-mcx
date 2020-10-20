import * as assert from "assert";
import * as vscode from "vscode";
import { executeCommands } from "../../execute-commands";

suite("executeCommands", () => {
  test("executing commands in parallel", async () => {
    const disposables: vscode.Disposable[] = [];
    const results: number[] = [];

    function registerCommand(commandName: string, callback: (...args: any[]) => void) {
      disposables.push(vscode.commands.registerCommand(commandName, callback));
    }
    registerCommand(
      "mockCommand1",
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            results.push(1);
            resolve();
          }, 300)
        )
    );
    registerCommand(
      "mockCommand2",
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            results.push(2);
            resolve();
          }, 200)
        )
    );
    registerCommand(
      "mockCommand3",
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            results.push(3);
            resolve();
          }, 100)
        )
    );

    await executeCommands(["mockCommand1", "mockCommand2", "mockCommand3"]);

    assert.deepEqual(results, [3, 2, 1]);

    for (const disposable of disposables) {
      disposable.dispose();
    }
  });
});
