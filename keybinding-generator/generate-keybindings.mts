/* eslint-env node */

export interface KeyBindingSource {
  key?: string;
  keys?: string[];
  command?: string;
  when?: string;
  whens?: string[];
  args?: unknown;
}

export interface KeyBinding {
  key?: string;
  mac?: string;
  command?: string;
  when?: string;
  args?: unknown;
}

export function isValidKey(key: string): boolean {
  if (key.trim() === "") {
    return false;
  }

  // * '+' must be only as concatenation of keys.
  // * Key combinations must be concatenated by '+' without surrounding white spaces.
  if (key.match(/\s\+/) || key.match(/\+\s/)) {
    return false;
  }

  return true;
}

export function replaceMetaWithEscape(keyCombo: string): string {
  if (keyCombo.includes(" ")) {
    throw new Error(`Key combo "${keyCombo}" has white spaces.`);
  }

  const strokes = keyCombo.split("+");
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

      // For keybindings with modifiers to work in Emacs in the terminal.
      // For example, if `ctrl+x ctrl+c` is assigned to some command in VSCode without "!terminalFocus" condition,
      // when the user presses `ctrl+x`, VSCode interrupts the key sequence expecting the following `ctrl+c` key stroke
      // and `ctrl+x` is not sent to the terminal.
      // It makes impossible to use the keybindings starting with `ctrl+x`
      // in Emacs (and some other apps) in the terminal
      // because they can't receive the `ctrl+x` key stroke sent from the terminal emulator of VSCode
      // So, we add the "!terminalFocus" condition to such keybindings so that VSCode doesn't interrupt the key strokes in the terminal.
      const isUnconditional = when == null;
      const hasModifiers = key.split("+").some((k) => ["ctrl", "shift", "alt", "meta"].includes(k));
      if (isUnconditional && hasModifiers) {
        when = addWhenCond(when, "!terminalFocus");
      }

      // Convert "meta" specifications
      if (key.includes("meta")) {
        // Generate a keybinding using ALT as meta.
        keybindings.push({
          key: replaceAll(key, "meta", "alt"),
          command: src.command,
          when: addWhenCond(when, "!config.emacs-mcx.useMetaPrefixMacCmd"),
          ...(src.args ? { args: src.args } : {}),
        });

        // Generate a keybinding using CMD as meta for macOS.
        keybindings.push({
          key: replaceAll(key, "meta", "alt"),
          mac: replaceAll(key, "meta", "cmd"),
          command: src.command,
          when: addWhenCond(when, "config.emacs-mcx.useMetaPrefixMacCmd"),
          ...(src.args ? { args: src.args } : {}),
        });

        // Generate keybindings using ESC and Ctrl+[ as meta.
        const keystrokes = key.split(" ").filter((k) => k);
        if (keystrokes.length === 1) {
          const keyWithEscapeMeta = replaceMetaWithEscape(key);
          keybindings.push({
            key: keyWithEscapeMeta,
            command: src.command,
            when: addWhenCond(when, "config.emacs-mcx.useMetaPrefixEscape"),
            ...(src.args ? { args: src.args } : {}),
          });
          keybindings.push({
            key: keyWithEscapeMeta.replace("escape", "ctrl+["),
            command: src.command,
            when: addWhenCond(when, "config.emacs-mcx.useMetaPrefixCtrlLeftBracket"),
            ...(src.args ? { args: src.args } : {}),
          });
        } else {
          console.warn(
            `"${key}" includes more than one key strokes then it's meta key specification cannot be converted to "ESC" and "ctrl+[".`,
          );
        }
      } else {
        keybindings.push({
          key,
          command: src.command,
          when,
          ...(src.args ? { args: src.args } : {}),
        });
      }
    });
  });

  return keybindings;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  return true;
}

export function generateKeybindingsForPrefixArgument(): KeyBinding[] {
  const keybindings: KeyBinding[] = [];

  // Generate keybindings for numeric characters.
  for (let num = 0; num <= 9; ++num) {
    keybindings.push(
      ...generateKeybindings({
        key: num.toString(),
        command: "emacs-mcx.subsequentArgumentDigit",
        when: "emacs-mcx.acceptingArgument && editorTextFocus",
        args: [num],
      }),
    );
    keybindings.push(
      ...generateKeybindings({
        key: `meta+${num.toString()}`,
        command: "emacs-mcx.subsequentArgumentDigit",
        when: "emacs-mcx.acceptingArgument && editorTextFocus && config.emacs-mcx.enableDigitArgument",
        args: [num],
      }),
    );
    keybindings.push(
      ...generateKeybindings({
        key: `meta+${num.toString()}`,
        command: "emacs-mcx.digitArgument",
        when: "!emacs-mcx.acceptingArgument && editorTextFocus && config.emacs-mcx.enableDigitArgument",
        args: [num],
      }),
    );
    keybindings.push({
      key: num.toString(),
      command: "emacs-mcx.typeChar",
      when: "!emacs-mcx.acceptingArgument && emacs-mcx.prefixArgumentExists && editorTextFocus",
      args: [num.toString()],
    });
  }

  // M--
  keybindings.push(
    ...generateKeybindings({
      key: "meta+-",
      when: "!emacs-mcx.acceptingArgument && editorTextFocus",
      command: "emacs-mcx.negativeArgument",
    }),
  );

  for (const char of ASSIGNABLE_KEYS_WO_NUMERICS) {
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

export function generateKeybindingsForTypeCharInRectMarkMode(): KeyBinding[] {
  const keybindings: KeyBinding[] = [];

  for (const char of ASSIGNABLE_KEYS) {
    keybindings.push({
      key: char,
      when: "emacs-mcx.inRectMarkMode && editorTextFocus && !editorReadonly",
      command: "emacs-mcx.typeChar",
      args: [char],
    });
  }

  return keybindings;
}

export function generateKeybindingsForRegisterCommands(): KeyBinding[] {
  const keybindings: KeyBinding[] = [];

  for (const char of ASSIGNABLE_KEYS) {
    keybindings.push({
      key: char,
      when: "emacs-mcx.acceptingRegisterName && editorTextFocus",
      command: "emacs-mcx.registerNameCommand",
      args: char,
    });
  }
  keybindings.push({
    key: "space",
    when: "emacs-mcx.acceptingRegisterName && editorTextFocus",
    command: "emacs-mcx.registerNameCommand",
    args: " ",
  });
  return keybindings;
}

function getAssignableKeys(includeNumerics: boolean): string[] {
  const keys: string[] = [];
  // Found these valid keys by registering all printable characters (0x20 <= charCode <= 0x7e) to the keybindings and picking up the validly registered keys from the keybindings setting tab.
  // Ref: Ascii printable characters: https://www.ascii-code.com/
  keys.push("'", ",", "-", ".", "/");
  if (includeNumerics) {
    for (let charCode = 0x30; charCode <= 0x39; charCode++) {
      // '0' ~ '9'
      keys.push(String.fromCharCode(charCode));
    }
  }
  keys.push(";", "=");
  for (let charCode = 0x41; charCode <= 0x5a; charCode++) {
    // 'A' ~ 'Z'
    keys.push(String.fromCharCode(charCode));
  }
  keys.push("[", "\\", "]", "`");
  for (let charCode = 0x61; charCode <= 0x7a; charCode++) {
    // 'a' ~ 'z'
    keys.push(String.fromCharCode(charCode));
  }

  return keys;
}
const ASSIGNABLE_KEYS = getAssignableKeys(true);
const ASSIGNABLE_KEYS_WO_NUMERICS = getAssignableKeys(false);

export function getTerminalSequenceKeybindings(key: string): string | undefined {
  const keyCombo = new Set(key.split("+"));
  const possibleModifiers = ["ctrl", "shift", "alt", "meta"];
  const modifiers = possibleModifiers.filter((mod) => keyCombo.has(mod));
  if (modifiers.length > 1) {
    console.warn(`Multiple modifiers found in key "${key}": ${modifiers.join(", ")}`);
    return;
  }
  const modifier = modifiers[0] || "";
  const chars = ASSIGNABLE_KEYS.filter((c) => keyCombo.has(c));
  console.log("Modifier:", modifier, "Chars:", chars);
  if (modifier === "meta") {
    return "\u001b" + chars.join(""); // ESC + chars
  }
  if (modifier === "ctrl") {
    if (chars.length !== 1) {
      console.warn(`Ctrl modifier is used with multiple characters in key "${key}": ${chars.join(", ")}`);
      return;
    }
    const char = chars[0];
    if (char.length !== 1) {
      console.warn(`Ctrl modifier is used with non-single character in key "${key}": ${char}`);
      return;
    }
    const charCode = char.charCodeAt(0) & 0x1f; // Ctrl modifier (0x1F) and char code
    return String.fromCharCode(charCode);
  }
  return;
}
