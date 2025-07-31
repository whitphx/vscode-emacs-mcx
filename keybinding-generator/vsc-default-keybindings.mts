import { addWhenCond } from "./utils.mjs";

export interface VscKeybinding {
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
  if (
    "args" in keybinding &&
    keybinding.args !== null &&
    (typeof keybinding.args !== "object" || Array.isArray(keybinding.args))
  ) {
    return false;
  }
  return true;
}
async function loadVscDefaultKeybindings(platform: "linux" | "win" | "osx"): Promise<VscKeybinding[]> {
  const url = `https://raw.githubusercontent.com/microsoft/vscode-docs/refs/heads/main/build/keybindings/doc.keybindings.${platform}.json`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`Failed to fetch keybindings from ${url}: ${String(error)}`);
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch keybindings: ${response.status} ${response.statusText}`);
  }
  const vscDefaultKeybindings = (await response.json()) as unknown;
  if (!Array.isArray(vscDefaultKeybindings)) {
    throw new Error("vscDefaultKeybindings is not an array");
  }

  vscDefaultKeybindings.forEach((binding) => {
    if (!isVscKeybinding(binding)) {
      throw new Error(`Unexpected keybinding data structure in vscDefaultKeybindings: ${JSON.stringify(binding)}`);
    }
  });

  return vscDefaultKeybindings as VscKeybinding[];
}

interface VscKeybindingPerPlatform {
  allPlatforms: VscKeybinding[];
  linuxSpecific: VscKeybinding[];
  winSpecific: VscKeybinding[];
  osxSpecific: VscKeybinding[];
}
function compileDefaultKeybindingsSet(
  keybindings: { linux: VscKeybinding[]; win: VscKeybinding[]; osx: VscKeybinding[] },
  ignoreKeys: boolean,
): VscKeybindingPerPlatform {
  const { linux, win, osx } = keybindings;

  const linuxJsons = linux.map((b) => (ignoreKeys ? { ...b, key: "" } : b)).map((b) => JSON.stringify(b));
  const winJsons = win.map((b) => (ignoreKeys ? { ...b, key: "" } : b)).map((b) => JSON.stringify(b));
  const osxJsons = osx.map((b) => (ignoreKeys ? { ...b, key: "" } : b)).map((b) => JSON.stringify(b));

  const allPlatformsJsons = linuxJsons.filter((b) => winJsons.includes(b) && osxJsons.includes(b));
  const linuxSpecificJsons = linuxJsons.filter((b) => !allPlatformsJsons.includes(b));
  const winSpecificJsons = winJsons.filter((b) => !allPlatformsJsons.includes(b));
  const osxSpecificJsons = osxJsons.filter((b) => !allPlatformsJsons.includes(b));
  const allPlatforms: VscKeybinding[] = Array.from(allPlatformsJsons).map((json) => JSON.parse(json) as VscKeybinding);
  const linuxSpecific: VscKeybinding[] = linuxSpecificJsons.map((json) => JSON.parse(json) as VscKeybinding);
  const winSpecific: VscKeybinding[] = winSpecificJsons.map((json) => JSON.parse(json) as VscKeybinding);
  const osxSpecific: VscKeybinding[] = osxSpecificJsons.map((json) => JSON.parse(json) as VscKeybinding);

  return {
    allPlatforms,
    linuxSpecific,
    winSpecific,
    osxSpecific,
  };
}

async function loadVscDefaultKeybindingsSet(): Promise<{
  withKeys: VscKeybindingPerPlatform;
  withoutKeys: VscKeybindingPerPlatform;
}> {
  const linux = await loadVscDefaultKeybindings("linux");
  const win = await loadVscDefaultKeybindings("win");
  const osx = await loadVscDefaultKeybindings("osx");

  return {
    withKeys: compileDefaultKeybindingsSet({ linux, win, osx }, false),
    withoutKeys: compileDefaultKeybindingsSet({ linux, win, osx }, true),
  };
}

let defaultKeybindingsSetCache: Awaited<ReturnType<typeof loadVscDefaultKeybindingsSet>> | null = null;
export async function prepareVscDefaultKeybindingsSet(): Promise<void> {
  defaultKeybindingsSetCache = await loadVscDefaultKeybindingsSet();
}

export function getVscDefaultKeybindingsSet(ignoreKeys: boolean): VscKeybindingPerPlatform {
  if (defaultKeybindingsSetCache) {
    return ignoreKeys ? defaultKeybindingsSetCache.withoutKeys : defaultKeybindingsSetCache.withKeys;
  }

  throw new Error("The default keybinding is not loaded. Call prepareVscDefaultKeybindingsSet() first.");
}

export function getVscDefaultKeybindingWhenCondition(command: string): string | undefined {
  const { allPlatforms, linuxSpecific, osxSpecific, winSpecific } = getVscDefaultKeybindingsSet(true);
  const simple = allPlatforms.find((keybinding) => keybinding.command === command)?.when;
  if (simple) {
    return simple;
  }

  const linuxWhen = linuxSpecific.find((keybinding) => keybinding.command === command)?.when;
  const osxWhen = osxSpecific.find((keybinding) => keybinding.command === command)?.when;
  const winWhen = winSpecific.find((keybinding) => keybinding.command === command)?.when;
  const whenParts = [];
  if (linuxWhen) {
    whenParts.push(addWhenCond(linuxWhen, "isLinux"));
  }
  if (osxWhen) {
    whenParts.push(addWhenCond(osxWhen, "isMac"));
  }
  if (winWhen) {
    whenParts.push(addWhenCond(winWhen, "isWindows"));
  }
  if (whenParts.length === 0) {
    return undefined;
  }
  if (whenParts.length === 1) {
    return whenParts[0];
  }
  return whenParts.map((cond) => `(${cond})`).join(" || ");
}
