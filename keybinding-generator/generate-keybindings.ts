export interface KeyBindingSource {
  key?: string;
  keys?: string[];
  command: string;
  when?: string;
  args?: string[];
}

export interface KeyBinding {
  key?: string;
  mac?: string;
  command: string;
  when?: string;
  args?: string[];
}

function addWhenCond(base: string | undefined, additional: string): string {
  if (!base || base.trim() === "") {
    return additional;
  }
  // XXX: This logic is not fully tested!
  if (base.includes("||")) {
    return `(${base}) && ${additional}`;
  }
  return `${base} && ${additional}`;
}

function replaceAll(src: string, search: string, replacement: string) {
  return src.split(search).join(replacement); // split + join = replaceAll
}

export function generateKeybindings(src: KeyBindingSource): KeyBinding[] {
  let keys: string[];
  if (src.key) {
    keys = [src.key];
    if (src.keys) {
      throw new Error(`Both .key and .keys are provided while just one of them should be.`);
    }
  } else if (src.keys) {
    keys = src.keys;
  } else {
    throw new Error(`Neither .key nor .keys are provided`);
  }

  const keybindings: KeyBinding[] = [];
  keys.forEach((key) => {
    if (key.includes("meta")) {
      // Generate a keybinding using ALT as meta.
      keybindings.push({
        key: replaceAll(key, "meta", "alt"),
        command: src.command,
        when: src.when,
        args: src.args,
      });

      // Generate a keybinding using CMD as meta for macOS.
      keybindings.push({
        mac: replaceAll(key, "meta", "cmd"),
        command: src.command,
        when: addWhenCond(src.when, "config.emacs-mcx.useMetaPrefixMacCmd"),
        args: src.args,
      });

      // Generate a keybinding using ESC as meta for macOS.
      const keystrokes = key.split(" ").filter((k) => k);
      if (keystrokes.length === 1) {
        keybindings.push({
          key: key.replace("meta+", "escape "), // NOTE: This is not fully compatible for all cases!
          command: src.command,
          when: addWhenCond(src.when, "config.emacs-mcx.useMetaPrefixEscape"),
          args: src.args,
        });
      } else {
        console.warn(
          `${key} includes more than one key strokes then it cannot be converted to a keybinding with ESC key.`
        );
      }
    } else {
      keybindings.push({
        key,
        command: src.command,
        when: src.when,
        args: src.args,
      });
    }
  });

  return keybindings;
}
