import * as path from "path";
import { runTests } from "@vscode/test-electron";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export async function runVscDefaultKeybindingGetter() {
  // Use the test runner `@vscode/test-electron` to run the script that gets VSCode default keybindings.
  // This is not a test, but this seems to be the only way to run the script in the VSCode environment.
  const extensionDevelopmentPath = path.resolve(__dirname, "./run-in-vscode/empty-extension");
  const extensionTestsPath = path.resolve(__dirname, "./run-in-vscode/index");
  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: ["--disable-extensions"],
  });
}
