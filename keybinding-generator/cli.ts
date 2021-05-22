import * as fs from "fs";
import * as stripJsonComments from "strip-json-comments";
import {
  KeyBinding,
  isKeyBindingSource,
  generateKeybindings,
  generateKeybindingsForPrefixArgument,
  generateKeybindingsForTypeCharInRectMarkMode,
} from "./generate-keybindings";

const srcFilePath = "./keybindings.json";
const packageDotJsonPath = "./package.json";

console.info(`Reading ${srcFilePath} ...`);
const srcContent = fs.readFileSync(srcFilePath, "utf8");
const srcJSON = JSON.parse(stripJsonComments(srcContent));
const keybindingSrcs: Array<any> = srcJSON["keybindings"];

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
fs.writeFileSync(packageDotJsonPath, JSON.stringify(packageJson, null, "\t") + "\n");
