import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import stripJsonComments from "strip-json-comments";
import {
  KeyBinding,
  isKeyBindingSource,
  generateKeybindings,
  generateKeybindingsForPrefixArgument,
  generateKeybindingsForTypeCharInRectMarkMode,
  generateKeybindingsForRegisterCommands,
  generateCtrlGKeybindings,
} from "./generate-keybindings.mjs";
import { prepareVscDefaultKeybindingsSet } from "./vsc-default-keybindings.mjs";
import { validate } from "./validate.mjs";

console.log("Loading the VSCode default keybindings...");
await prepareVscDefaultKeybindingsSet();

const srcDirPath = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "../keybindings/");
const srcFileNames = fs
  .readdirSync(srcDirPath, { withFileTypes: true })
  .filter((dirent) => dirent.isFile())
  .map((dirent) => dirent.name);
const packageJsonPath = url.fileURLToPath(import.meta.resolve("../package.json"));

const keybindingSrcs: Array<unknown> = [];
for (const srcFileName of srcFileNames) {
  const srcFilePath = path.join(srcDirPath, srcFileName);

  console.info(`Reading ${srcFilePath} ...`);
  const srcJsonContent = fs.readFileSync(srcFilePath, "utf8");
  const srcJson = JSON.parse(stripJsonComments(srcJsonContent)) as unknown;
  if (srcJson == null || typeof srcJson !== "object") {
    throw new Error(`Unexpected type for srcJson: ${typeof srcJson} (${String(srcJson)})`);
  }
  if (!Array.isArray(srcJson)) {
    throw new Error(`JSON content in ${srcFilePath} is not an array: ${JSON.stringify(srcJson)}`);
  }
  keybindingSrcs.push(...(srcJson as unknown[]));
}

const dstKeybindings: KeyBinding[] = [];

for (const keybindingSrc of keybindingSrcs) {
  if (keybindingSrc == null || typeof keybindingSrc !== "object") {
    throw new Error(`srcJson["keybindings"][] is unexpectedly null or not an object: ${String(keybindingSrc)}`);
  }

  if ("$special" in keybindingSrc) {
    // XXX: Escape hatch for prefix argument keybindings.
    if (keybindingSrc.$special === "universalArgumentTypes") {
      console.log("Adding keybindings for types following universal argument");
      dstKeybindings.push(...generateKeybindingsForPrefixArgument());
      continue;
    }
    if (keybindingSrc.$special === "rectMarkModeTypes") {
      console.log("Adding keybindings for types in rectangle-mark-mode");
      dstKeybindings.push(...generateKeybindingsForTypeCharInRectMarkMode());
      continue;
    }
    if (keybindingSrc.$special == "registerCommandTypes") {
      console.log("Adding keybindings for register commands");
      dstKeybindings.push(...generateKeybindingsForRegisterCommands());
      continue;
    }
    if (keybindingSrc.$special === "cancelKeybindings") {
      const ctrlGKeybindings = generateCtrlGKeybindings();
      dstKeybindings.push(...ctrlGKeybindings);
      continue;
    }
  }

  if (!isKeyBindingSource(keybindingSrc)) {
    throw new Error(`${JSON.stringify(keybindingSrc)} is not a valid source`);
  }

  const keybindings = generateKeybindings(keybindingSrc);
  dstKeybindings.push(...keybindings);
}

validate(dstKeybindings);

console.info(`Reading ${packageJsonPath} ...`);
const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");
const packageJson = JSON.parse(packageJsonContent) as Record<string, Record<string, unknown>>;

console.info(`Overwriting ${packageJsonPath} ...`);
packageJson["contributes"]["keybindings"] = dstKeybindings;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, "  ") + "\n");
