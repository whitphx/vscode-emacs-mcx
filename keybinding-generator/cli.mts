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

const srcFilePath = url.fileURLToPath(import.meta.resolve("../keybindings.json"));
const packageDotJsonPath = url.fileURLToPath(import.meta.resolve("../package.json"));

console.info(`Reading ${srcFilePath} ...`);
const srcContent = fs.readFileSync(srcFilePath, "utf8");
const srcJSON = JSON.parse(stripJsonComments(srcContent));
const keybindingSrcs: Array<any> = srcJSON["keybindings"]; // eslint-disable-line @typescript-eslint/no-explicit-any

let dstKeybindings: KeyBinding[] = [];

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
  dstKeybindings = dstKeybindings.concat(keybindings);
});

console.info(`Reading ${packageDotJsonPath} ...`);
const packageJsonContent = fs.readFileSync(packageDotJsonPath, "utf8");
const packageJson = JSON.parse(packageJsonContent);

console.info(`Overwriting ${packageDotJsonPath} ...`);
packageJson["contributes"]["keybindings"] = dstKeybindings;
fs.writeFileSync(packageDotJsonPath, JSON.stringify(packageJson, null, "  ") + "\n");
