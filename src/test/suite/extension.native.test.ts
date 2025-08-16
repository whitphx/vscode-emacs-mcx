import assert from "assert";
import vscode from "vscode";
import path from "path";

import { Configuration } from "../../configuration/configuration";
import { getCommandIds } from "../../commands";

suite("package.json", () => {
  let packageJson: unknown;

  setup(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    packageJson = require(path.join(__dirname, "../../../package.json"));
    assert.ok(packageJson, "package.json should be loaded");

    // @ts-expect-error packageJson is not typed
    const extensionName: string = packageJson["publisher"] + "." + packageJson["name"];

    const extension = vscode.extensions.getExtension(extensionName);
    assert.ok(extension, `Extension '${extensionName}' should be available.`);
    extension?.activate();
  });

  test("all keys have handlers", async () => {
    const registeredCommands = await vscode.commands.getCommands();

    // @ts-expect-error packageJson is not typed
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const keybindings = packageJson.contributes.keybindings as Array<Record<string, unknown>>;
    assert.ok(keybindings, "keybindings should be defined in package.json");

    const exceptions = [
      "", // Empty string is used for unregistering commands.
      "references-view.findReferences", // This command is registered by the references-view extension and it's not activated in the test environment.
    ];

    for (const keybinding of keybindings) {
      const command = keybinding.command;
      assert.ok(typeof command === "string", "command should be a string");
      assert.ok(
        registeredCommands.includes(command) || exceptions.includes(command),
        `Command '${command}' should be registered.`,
      );
    }
  });

  test("all command IDs are registered", async () => {
    const registeredCommands = await vscode.commands.getCommands();
    const commandIds = getCommandIds();
    const expectedExtensionCommandIds = commandIds.map((id) => `emacs-mcx.${id}`);

    for (const commandId of expectedExtensionCommandIds) {
      assert.ok(registeredCommands.includes(commandId), `Command ID '${commandId}' should be registered.`);
    }
  });

  test("all defined configurations in package.json have handlers in the Configuration class, or consumed in at least one when clause in package.json", () => {
    // @ts-expect-error packageJson is not typed
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const pkgConfigurations = packageJson.contributes?.configuration?.properties as unknown;
    assert.ok(pkgConfigurations, "package.json should have contributes.configuration.properties");
    const keys = Object.keys(pkgConfigurations);
    assert.notEqual(keys.length, 0, "package.json should have contributes.configuration.properties with keys");
    assert.ok(keys.every((key) => key.startsWith("emacs-mcx.")));

    // @ts-expect-error packageJson is not typed
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const keybindings = packageJson.contributes.keybindings as Array<Record<string, unknown>>;

    const handlers = Object.keys(Configuration.instance);
    const unhandled = keys.filter((key) => {
      const keyFirstSegment = key.split(".")[1]; // Extract the first segment without the `emacs-mcx.` prefix from `key`, e.g. get `foo` from 'emacs-mcx.foo.bar.baz'.
      if (keyFirstSegment != null && handlers.includes(keyFirstSegment)) {
        return false;
      }

      if (keybindings.some((kb) => kb.when && (kb.when as string).includes(key))) {
        return false;
      }

      return true;
    });
    assert.strictEqual(
      unhandled.length,
      0,
      `All configurations in package.json should have handlers. Unhandled: ${unhandled.join(", ")}`,
    );
  });
});
