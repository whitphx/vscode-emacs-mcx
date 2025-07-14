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
const keybindingSrcs = srcJson["keybindings"] as Array<unknown>;

const dstKeybindings: KeyBinding[] = [];

keybindingSrcs.forEach((keybindingSrc) => {
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
