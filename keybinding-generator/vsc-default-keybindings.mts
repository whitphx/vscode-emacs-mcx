interface VscKeybinding {
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
