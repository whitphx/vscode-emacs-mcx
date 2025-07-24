import path from "path";
import fsPromises from "node:fs/promises";
import { runTests } from "@vscode/test-electron";
import stripJsonComments from "strip-json-comments";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export async function runVscDefaultKeybindingDumper() {
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

interface VscKeybinding {
  key: string;
  mac?: string;
  command: string;
  when?: string;
  args?: unknown;
}
function isVscKeybinding(keybinding: unknown): keybinding is VscKeybinding {
  if (keybinding == null || typeof keybinding !== "object") {
    return false;
  }
  if (!("key" in keybinding) || typeof keybinding.key !== "string") {
    return false;
  }
  if (!("command" in keybinding) || typeof keybinding.command !== "string") {
    return false;
  }
  if ("when" in keybinding && typeof keybinding.when !== "string") {
    return false;
  }
  if ("args" in keybinding && typeof keybinding.args !== "object") {
    return false;
  }
  return true;
}
export async function loadDumpedVscDefaultKeybindings(): Promise<VscKeybinding[]> {
  const vscDefaultKeybindingsDumpPath = path.resolve(__dirname, "./.tmp/vsc-default-keybindings.json");
  const vscDefaultKeybindingsContent = await fsPromises.readFile(vscDefaultKeybindingsDumpPath, "utf8");
  const vscDefaultKeybindings = JSON.parse(stripJsonComments(vscDefaultKeybindingsContent)) as unknown;
  if (!Array.isArray(vscDefaultKeybindings)) {
    throw new Error("vscodeDefaultKeybindings is not an array");
  }

  vscDefaultKeybindings.forEach((binding) => {
    if (!isVscKeybinding(binding)) {
      throw new Error(`Unexpected keybinding data structure in vscDefaultKeybindings: ${JSON.stringify(binding)}`);
    }
  });

  return vscDefaultKeybindings as VscKeybinding[];
}
