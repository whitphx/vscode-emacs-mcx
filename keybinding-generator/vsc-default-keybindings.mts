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
  if ("args" in keybinding && typeof keybinding.args !== "object") {
    return false;
  }
  return true;
}
export async function loadVscDefaultKeybindings(platform: "linux" | "win" | "osx"): Promise<VscKeybinding[]> {
  const url = `https://raw.githubusercontent.com/microsoft/vscode-docs/refs/heads/main/build/keybindings/doc.keybindings.${platform}.json`;
  const response = await fetch(url);
  const vscDefaultKeybindingsContent = await response.text();
  const vscDefaultKeybindings = JSON.parse(vscDefaultKeybindingsContent) as unknown;
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

interface VscKeybindingPerPlatform {
  allPlatforms: VscKeybinding[];
  linuxOnly: VscKeybinding[];
  winOnly: VscKeybinding[];
  osxOnly: VscKeybinding[];
}
export async function loadVscDefaultKeybindingsSet(): Promise<VscKeybindingPerPlatform> {
  const linux = await loadVscDefaultKeybindings("linux");
  const win = await loadVscDefaultKeybindings("win");
  const osx = await loadVscDefaultKeybindings("osx");

  const linuxJsons = linux.map((b) => JSON.stringify(b));
  const winJsons = win.map((b) => JSON.stringify(b));
  const osxJsons = osx.map((b) => JSON.stringify(b));

  const allPlatformsJsons = new Set<string>([...linuxJsons, ...winJsons, ...osxJsons]);
  const linuxOnlyJsons = linuxJsons.filter((b) => !allPlatformsJsons.has(b));
  const winOnlyJsons = winJsons.filter((b) => !allPlatformsJsons.has(b));
  const osxOnlyJsons = osxJsons.filter((b) => !allPlatformsJsons.has(b));
  const allPlatforms: VscKeybinding[] = Array.from(allPlatformsJsons).map((json) => JSON.parse(json) as VscKeybinding);
  const linuxOnly: VscKeybinding[] = linuxOnlyJsons.map((json) => JSON.parse(json) as VscKeybinding);
  const winOnly: VscKeybinding[] = winOnlyJsons.map((json) => JSON.parse(json) as VscKeybinding);
  const osxOnly: VscKeybinding[] = osxOnlyJsons.map((json) => JSON.parse(json) as VscKeybinding);

  return {
    allPlatforms,
    linuxOnly,
    winOnly,
    osxOnly,
  };
}
