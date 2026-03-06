import stripJsonComments from "strip-json-comments";
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
  const platformFilePrefix = platform === "linux" ? "linux" : platform === "win" ? "windows" : "macos";
  const url = `https://raw.githubusercontent.com/codebling/vs-code-default-keybindings/refs/heads/master/${platformFilePrefix}.keybindings.json`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`Failed to fetch keybindings from ${url}`, {
      cause: error,
    });
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch keybindings for ${platform} (${url}): ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const vscDefaultKeybindings = JSON.parse(stripJsonComments(text)) as unknown;
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
export function compileDefaultKeybindingsSet(
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

/** @internal Inject mock data for testing without network calls. */
export function _setDefaultKeybindingsSetForTesting(keybindings: {
  linux: VscKeybinding[];
  win: VscKeybinding[];
  osx: VscKeybinding[];
}): void {
  defaultKeybindingsSetCache = {
    withKeys: compileDefaultKeybindingsSet(keybindings, false),
    withoutKeys: compileDefaultKeybindingsSet(keybindings, true),
  };
}

export function getVscDefaultKeybindingsSet(ignoreKeys: boolean): VscKeybindingPerPlatform {
  if (defaultKeybindingsSetCache) {
    return ignoreKeys ? defaultKeybindingsSetCache.withoutKeys : defaultKeybindingsSetCache.withKeys;
  }

  throw new Error("The default keybinding is not loaded. Call prepareVscDefaultKeybindingsSet() first.");
}

export function getVscDefaultKeybindingWhenCondition(command: string): string | undefined {
  const { allPlatforms, linuxSpecific, osxSpecific, winSpecific } = getVscDefaultKeybindingsSet(true);

  const allPlatformMatch = allPlatforms.find((keybinding) => keybinding.command === command);
  const linuxMatch = linuxSpecific.find((keybinding) => keybinding.command === command);
  const osxMatch = osxSpecific.find((keybinding) => keybinding.command === command);
  const winMatch = winSpecific.find((keybinding) => keybinding.command === command);

  if (!allPlatformMatch && !linuxMatch && !osxMatch && !winMatch) {
    throw new Error(`Command "${command}" not found in VSCode default keybindings`);
  }

  if (allPlatformMatch?.when) {
    return allPlatformMatch.when;
  }
  if (allPlatformMatch) {
    return undefined;
  }

  // Even when the command is only defined in a specific platform,
  // we define its keybinding on all platforms from this extension.
  // OSX is the top priority because I use it :)
  const srcDefaultWhen = osxMatch?.when ?? winMatch?.when ?? linuxMatch?.when;

  // For each platform, determine the effective `when`:
  // - Match with `when` → use that condition
  // - Match without `when` (unconditional) → undefined
  // - No match → use fallback from other platforms
  const linuxWhen = linuxMatch ? linuxMatch.when : srcDefaultWhen;
  const osxWhen = osxMatch ? osxMatch.when : srcDefaultWhen;
  const winWhen = winMatch ? winMatch.when : srcDefaultWhen;

  if (osxWhen === linuxWhen && linuxWhen === winWhen) {
    // All platforms share the same condition (or all unconditional)
    return osxWhen;
  }

  const whenParts = [];
  if (linuxWhen) {
    whenParts.push(addWhenCond(linuxWhen, "isLinux"));
  } else if (linuxMatch) {
    // Unconditional on Linux
    whenParts.push("isLinux");
  }
  if (osxWhen) {
    whenParts.push(addWhenCond(osxWhen, "isMac"));
  } else if (osxMatch) {
    // Unconditional on macOS
    whenParts.push("isMac");
  }
  if (winWhen) {
    whenParts.push(addWhenCond(winWhen, "isWindows"));
  } else if (winMatch) {
    // Unconditional on Windows
    whenParts.push("isWindows");
  }
  if (whenParts.length === 0) {
    return undefined;
  }
  if (whenParts.length === 1) {
    return whenParts[0];
  }
  return whenParts.map((cond) => `(${cond})`).join(" || ");
}
