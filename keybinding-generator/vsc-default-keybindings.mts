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
    throw new Error(`Failed to fetch keybindings from ${url}`, {
      cause: error,
    });
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch keybindings: ${response.status} ${response.statusText}`);
  }
  const vscDefaultKeybindings = await response.json();
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

  const linuxJsonStrs = linux.map((b) => (ignoreKeys ? { ...b, key: "" } : b)).map((b) => JSON.stringify(b));
  const winJsonStrs = win.map((b) => (ignoreKeys ? { ...b, key: "" } : b)).map((b) => JSON.stringify(b));
  const osxJsonStrs = osx.map((b) => (ignoreKeys ? { ...b, key: "" } : b)).map((b) => JSON.stringify(b));

  const allPlatformsJsonStrs = linuxJsonStrs.filter((b) => winJsonStrs.includes(b) && osxJsonStrs.includes(b));
  const linuxSpecificJsonStrs = linuxJsonStrs.filter((b) => !allPlatformsJsonStrs.includes(b));
  const winSpecificJsonStrs = winJsonStrs.filter((b) => !allPlatformsJsonStrs.includes(b));
  const osxSpecificJsonStrs = osxJsonStrs.filter((b) => !allPlatformsJsonStrs.includes(b));
  const allPlatforms: VscKeybinding[] = Array.from(allPlatformsJsonStrs).map(
    (json) => JSON.parse(json) as VscKeybinding,
  );
  const linuxSpecific: VscKeybinding[] = linuxSpecificJsonStrs.map((json) => JSON.parse(json) as VscKeybinding);
  const winSpecific: VscKeybinding[] = winSpecificJsonStrs.map((json) => JSON.parse(json) as VscKeybinding);
  const osxSpecific: VscKeybinding[] = osxSpecificJsonStrs.map((json) => JSON.parse(json) as VscKeybinding);

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

  const srcLinuxWhen = linuxSpecific.find((keybinding) => keybinding.command === command)?.when;
  const srcOsxWhen = osxSpecific.find((keybinding) => keybinding.command === command)?.when;
  const srcWinWhen = winSpecific.find((keybinding) => keybinding.command === command)?.when;

  // Even when the command is only defined in a specific platform,
  // we define its keybinding on all platforms from this extension.
  const srcDefaultWhen = srcOsxWhen ?? srcWinWhen ?? srcLinuxWhen; // OSX is the top priority because I use it :)

  const linuxWhen = srcLinuxWhen && srcLinuxWhen !== srcDefaultWhen ? srcLinuxWhen : srcDefaultWhen;
  const osxWhen = srcOsxWhen && srcOsxWhen !== srcDefaultWhen ? srcOsxWhen : srcDefaultWhen;
  const winWhen = srcWinWhen && srcWinWhen !== srcDefaultWhen ? srcWinWhen : srcDefaultWhen;

  if (osxWhen === linuxWhen && linuxWhen === winWhen) {
    // All platforms share the same condition
    return osxWhen;
  }

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
