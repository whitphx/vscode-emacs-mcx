import * as fs from "fs";
import * as stripJsonComments from "strip-json-comments";
import { KeyBinding, KeyBindingSource, generateKeybindings } from "./generate-keybindings";

const srcFilePath = "./keybindings.json";
const packageDotJsonPath = "./package.json";

console.info(`Reading ${srcFilePath} ...`);
const srcContent = fs.readFileSync(srcFilePath, "utf8");
const srcJSON = JSON.parse(stripJsonComments(srcContent));
const keybindingSrcs: KeyBindingSource[] = srcJSON["keybindings"];

let dstKeybindings: KeyBinding[] = [];

keybindingSrcs.forEach((keybindingSrc) => {
  const keybindings = generateKeybindings(keybindingSrc);
  dstKeybindings = dstKeybindings.concat(keybindings);
});

console.info(`Reading ${packageDotJsonPath} ...`);
const packageJsonContent = fs.readFileSync(packageDotJsonPath, "utf8");
const packageJson = JSON.parse(packageJsonContent);

console.info(`Overwriting ${packageDotJsonPath} ...`);
packageJson["contributes"]["keybindings"] = dstKeybindings;
fs.writeFileSync(packageDotJsonPath, JSON.stringify(packageJson, null, "\t"));
