/* eslint-env node */

import fs from "node:fs";
import url from "node:url";
import stripJsonComments from "strip-json-comments";
import {
  KeyBinding,
  isKeyBindingSource,
  generateKeybindings,
  generateKeybindingsForPrefixArgument,
  generateKeybindingsForTypeCharInRectMarkMode,
  generateKeybindingsForRegisterCommands,
} from "./generate-keybindings.mjs";
import { validate } from "./validate.mjs";
import { runVscDefaultKeybindingGetter } from "./vscode-keybindings.mjs";

console.log("Run a script to get VSCode default keybindings in the VSCode environment ...");
await runVscDefaultKeybindingGetter();

const srcFilePath = url.fileURLToPath(import.meta.resolve("../keybindings.json"));
const packageJsonPath = url.fileURLToPath(import.meta.resolve("../package.json"));

console.info(`Reading ${srcFilePath} ...`);
const srcJsonContent = fs.readFileSync(srcFilePath, "utf8");
const srcJson = JSON.parse(stripJsonComments(srcJsonContent)) as unknown;
if (srcJson == null || typeof srcJson !== "object") {
  throw new Error(`Unexpected type for srcJson: ${typeof srcJson} (${String(srcJson)})`);
}
if (!("keybindings" in srcJson)) {
  throw new Error("The key .keybindings doesn't exist in srcJson");
}
if (!Array.isArray(srcJson["keybindings"])) {
  throw new Error(`srcJson["keybindings"] is not an array: ${String(srcJson["keybindings"])}`);
}
const keybindingSrcs = srcJson["keybindings"] as Array<unknown>;

console.info(`Reading VSCode default keybindings ...`);
const vscDefaultKeybindingsDumpPath = url.fileURLToPath(import.meta.resolve("../vsc-default-keybindings.json"));
const vscDefaultKeybindingsContent = fs.readFileSync(vscDefaultKeybindingsDumpPath, "utf8");
const vscDefaultKeybindings = JSON.parse(stripJsonComments(vscDefaultKeybindingsContent)) as unknown;
if (!Array.isArray(vscDefaultKeybindings)) {
  throw new Error("vscodeDefaultKeybindings is not an array");
}

const dstKeybindings: KeyBinding[] = [];

keybindingSrcs.forEach((keybindingSrc) => {
  if (keybindingSrc == null || typeof keybindingSrc !== "object") {
    throw new Error(`srcJson["keybindings"][] is unexpectedly null or not an object: ${String(keybindingSrc)}`);
  }

  if ("$special" in keybindingSrc) {
    // XXX: Escape hatch for prefix argument keybindings.
    if (keybindingSrc.$special === "universalArgumentTypes") {
      console.log("Adding keybindings for types following universal argument");
      dstKeybindings.push(...generateKeybindingsForPrefixArgument());
      return;
    }
    if (keybindingSrc.$special === "rectMarkModeTypes") {
      console.log("Adding keybindings for types in rectangle-mark-mode");
      dstKeybindings.push(...generateKeybindingsForTypeCharInRectMarkMode());
      return;
    }
    if (keybindingSrc.$special == "registerCommandTypes") {
      console.log("Adding keybindings for register commands");
      dstKeybindings.push(...generateKeybindingsForRegisterCommands());
      return;
    }
    if (keybindingSrc.$special === "cancelKeybindings") {
      const defaultEscapeKeybindings = vscDefaultKeybindings.filter((binding: unknown) => {
        if (typeof binding !== "object" || binding == null || !("key" in binding) || !("command" in binding)) {
          throw new Error(`Unexpected keybinding data structure in vscDefaultKeybindings: ${JSON.stringify(binding)}`);
        }
        if (typeof binding.key !== "string" || typeof binding.command !== "string") {
          throw new Error(`Unexpected keybinding data structure in vscDefaultKeybindings: ${JSON.stringify(binding)}`);
        }
        return binding.key === "escape" && !binding.command.startsWith("emacs-mcx.");
      });
      const ctrlGKeybindings: KeyBinding[] = (
        defaultEscapeKeybindings as Array<{ command: string; when?: string; args?: string }>
      ).map((binding) => {
        return {
          key: "ctrl+g",
          command: binding.command,
          when: binding.when,
          args: binding.args,
        };
      });
      dstKeybindings.push(...ctrlGKeybindings);
      return;
    }
  }

  if (!isKeyBindingSource(keybindingSrc)) {
    throw new Error(`${JSON.stringify(keybindingSrc)} is not a valid source`);
  }

  const keybindings = generateKeybindings(keybindingSrc);
  dstKeybindings.push(...keybindings);
});

validate(dstKeybindings);

console.info(`Reading ${packageJsonPath} ...`);
const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");
const packageJson = JSON.parse(packageJsonContent) as Record<string, Record<string, unknown>>;

console.info(`Overwriting ${packageJsonPath} ...`);
packageJson["contributes"]["keybindings"] = dstKeybindings;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, "  ") + "\n");
