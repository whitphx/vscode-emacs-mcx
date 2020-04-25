export interface KeyBindingSource {
  key?: string;
  keys?: string[];
  command: string;
  when?: string;
  whens?: string[];
  args?: string[];
}

export interface KeyBinding {
  key?: string;
  mac?: string;
  command: string;
  when?: string;
  args?: string[];
}

export function isValidKey(key: string): boolean {
  if (key.trim() === "") {
    return false;
  }

  // * '+' must be only as a concatenator of keys.
  // * Key combinations must be concatenated by '+' without surrouding white spaces.
  if (key.match(/[^a-z]\+/) || key.match(/\+[^a-z]/)) {
    return false;
  }

  return true;
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
    throw new Error(`Neither .key nor .keys are provided: ${JSON.stringify(src)}`);
  }

  let whens: (string | undefined)[] = [];
  if (src.when) {
    whens = [src.when];
    if (src.whens) {
      throw new Error(`Both .when and .whens are provided while just one of them should be.`);
    }
  } else if (src.whens) {
    whens = src.whens;
  }
  if (whens.length === 0) {
    whens = [undefined];
  }

  const keybindings: KeyBinding[] = [];
  whens.forEach((when) => {
    keys.forEach((key) => {
      if (!isValidKey(key)) {
        throw new Error(`Unparsable key string: "${key}"`);
      }

      if (key.includes("meta")) {
        // Generate a keybinding using ALT as meta.
        keybindings.push({
          key: replaceAll(key, "meta", "alt"),
          command: src.command,
          when,
          args: src.args,
        });

        // Generate a keybinding using CMD as meta for macOS.
        keybindings.push({
          mac: replaceAll(key, "meta", "cmd"),
          command: src.command,
          when: addWhenCond(when, "config.emacs-mcx.useMetaPrefixMacCmd"),
          args: src.args,
        });

        // Generate a keybinding using ESC as meta for macOS.
        const keystrokes = key.split(" ").filter((k) => k);
        if (keystrokes.length === 1) {
          keybindings.push({
            key: key.replace("meta+", "escape "), // NOTE: This is not fully compatible for all cases!
            command: src.command,
            when: addWhenCond(when, "config.emacs-mcx.useMetaPrefixEscape"),
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
          when,
          args: src.args,
        });
      }
    });
  });

  return keybindings;
}

export function isKeyBindingSource(maybeSrc: { [key: string]: any }): maybeSrc is KeyBindingSource {
  // Check for .key
  if (typeof maybeSrc.key !== "undefined" && typeof maybeSrc.key !== "string") {
    return false;
  }

  // Checks for .keys
  if (typeof maybeSrc.keys !== "undefined") {
    if (!Array.isArray(maybeSrc.keys)) {
      return false;
    }
    if (maybeSrc.keys.some((k) => typeof k !== "string")) {
      return false;
    }
  }

  // Check for .command
  if (typeof maybeSrc.command !== "string") {
    return false;
  }

  // Check for .when
  if (typeof maybeSrc.when !== "undefined" && typeof maybeSrc.when !== "string") {
    return false;
  }

  // Checks for .whens
  if (typeof maybeSrc.whens !== "undefined") {
    if (!Array.isArray(maybeSrc.whens)) {
      return false;
    }
    if (maybeSrc.whens.some((w) => typeof w !== "string")) {
      return false;
    }
  }

  // Checks for .args
  if (typeof maybeSrc.args !== "undefined") {
    if (!Array.isArray(maybeSrc.args)) {
      return false;
    }
    if (maybeSrc.args.some((a) => typeof a !== "string")) {
      return false;
    }
  }

  return true;
}
