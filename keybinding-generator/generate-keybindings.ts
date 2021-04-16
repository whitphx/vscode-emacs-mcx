export interface KeyBindingSource {
  key?: string;
  keys?: string[];
  command?: string;
  when?: string;
  whens?: string[];
  args?: (string | number)[];
}

export interface KeyBinding {
  key?: string;
  mac?: string;
  command?: string;
  when?: string;
  args?: (string | number)[];
}

export function isValidKey(key: string): boolean {
  if (key.trim() === "") {
    return false;
  }

  // * '+' must be only as a concatenator of keys.
  // * Key combinations must be concatenated by '+' without surrouding white spaces.
  if (key.match(/\s\+/) || key.match(/\+\s/)) {
    return false;
  }

  return true;
}

export function replaceMetaWithEscape(keycombo: string): string {
  if (keycombo.includes(" ")) {
    throw new Error(`Key combo "${keycombo}" has white spaces.`);
  }

  const strokes = keycombo.split("+");
  const strokesWithoutMeta = strokes.filter((stroke) => stroke !== "meta");
  const metaIncluded = strokes.includes("meta");

  return (metaIncluded ? "escape " : "") + strokesWithoutMeta.join("+");
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

      // Convert "meta" specifications
      if (key.includes("meta")) {
        // Generate a keybinding using ALT as meta.
        keybindings.push({
          key: replaceAll(key, "meta", "alt"),
          command: src.command,
          when: addWhenCond(when, "!config.emacs-mcx.useMetaPrefixMacCmd"),
          args: src.args,
        });

        // Generate a keybinding using CMD as meta for macOS.
        keybindings.push({
          key: replaceAll(key, "meta", "alt"),
          mac: replaceAll(key, "meta", "cmd"),
          command: src.command,
          when: addWhenCond(when, "config.emacs-mcx.useMetaPrefixMacCmd"),
          args: src.args,
        });

        // Generate keybindings using ESC and Ctrl+[ as meta.
        const keystrokes = key.split(" ").filter((k) => k);
        if (keystrokes.length === 1) {
          const keyWithEscapeMeta = replaceMetaWithEscape(key);
          keybindings.push({
            key: keyWithEscapeMeta,
            command: src.command,
            when: addWhenCond(when, "config.emacs-mcx.useMetaPrefixEscape"),
            args: src.args,
          });
          keybindings.push({
            key: keyWithEscapeMeta.replace("escape", "ctrl+["),
            command: src.command,
            when: addWhenCond(when, "config.emacs-mcx.useMetaPrefixCtrlLeftBracket"),
            args: src.args,
          });
        } else {
          console.warn(
            `"${key}" includes more than one key strokes then it's meta key specification cannot be converted to "ESC" and "ctrl+[".`
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
  if (typeof maybeSrc.command !== "undefined" && typeof maybeSrc.command !== "string") {
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
    if (maybeSrc.args.some((a) => typeof a !== "string" && typeof a !== "number")) {
      return false;
    }
  }

  return true;
}

export function generateKeybindingsForPrefixArgument(): KeyBinding[] {
  const keybindings: KeyBinding[] = [];

  // Generate keybindings for numeric characters.
  for (let num = 0; num <= 9; ++num) {
    keybindings.push({
      key: num.toString(),
      when: "emacs-mcx.acceptingArgument && editorTextFocus && !editorReadonly",
      command: "emacs-mcx.universalArgumentDigit",
      args: [num],
    });
    keybindings.push({
      key: num.toString(),
      command: "emacs-mcx.typeChar",
      when: "!emacs-mcx.acceptingArgument && emacs-mcx.prefixArgumentExists && editorTextFocus && !editorReadonly",
      args: [num.toString()],
    });
  }

  // Ascii all printable characters excluding space, delete, and numeric characters.
  // Ref: https://www.ascii-code.com/
  const asciiPrintableChars: string[] = [];
  // '!' ~ '/'
  for (let charCode = 0x21; charCode <= 0x2f; charCode++) {
    asciiPrintableChars.push(String.fromCharCode(charCode));
  }
  // 0x30 - 0x39 are numeric, '0' ~ '9', and so skipped.
  // ':' ~ '~'
  for (let charCode = 0x3a; charCode <= 0x7e; charCode++) {
    asciiPrintableChars.push(String.fromCharCode(charCode));
  }

  for (const char of asciiPrintableChars) {
    keybindings.push({
      key: char,
      when: "emacs-mcx.prefixArgumentExists && editorTextFocus && !editorReadonly",
      command: "emacs-mcx.typeChar",
      args: [char],
    });
  }

  // In addition, special characters.
  keybindings.push({
    key: "space",
    when: "emacs-mcx.prefixArgumentExists && editorTextFocus && !editorReadonly",
    command: "emacs-mcx.typeChar",
    args: [" "],
  });
  keybindings.push({
    key: "enter",
    command: "emacs-mcx.newLine",
    when: "emacs-mcx.prefixArgumentExists && editorTextFocus && !editorReadonly",
  });
  keybindings.push({
    key: "backspace",
    command: "emacs-mcx.deleteBackwardChar",
    when: "emacs-mcx.prefixArgumentExists && editorTextFocus && !editorReadonly",
  });

  return keybindings;
}
