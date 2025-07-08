/* eslint-env node */

export interface KeyBindingSource {
  key?: string;
  keys?: string[];
  command?: string;
  when?: string;
  whens?: string[];
  args?: unknown;
  isearchInterruptible?: boolean | "interruptOnly";
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

const FIND_EDIT_KEYS = [
  "up",
  "down",
  "left",
  "right",
  "home",
  "end",
  "ctrl+f",
  "ctrl+right",
  "ctrl+b",
  "ctrl+left",
  "ctrl+a",
  "ctrl+e",
  "ctrl+n",
  "ctrl+p",
];
const NO_FIND_EXIT_KEYS_WIN_LINUX = ["ctrl+z", "ctrl+x", "ctrl+c", "ctrl+v"];
const NO_FIND_EXIT_KEYS_MAC = ["cmd+z", "cmd+x", "cmd+c", "cmd+v"];

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
      // For example, if `ctrl+x ctrl+c` is assigned to some command in VSCode,
      // when the user presses `ctrl+x`, VSCode interrupts the key sequence
      // waiting for the second key stroke e.g. `ctrl+c`,
      // and the first `ctrl+x` is never sent to the terminal.
      // It makes impossible to use keybindings starting with `ctrl+x`
      // in Emacs (and some other apps) in the terminal
      // because they never receives `ctrl+x` from the terminal emulator.
      // So we warn potentially problematic keybindings that may cause the problem.
      const isUnconditional = when == null;
      const keyElements = key.split("+");
      const hasModifiers = keyElements.some((k) => ["ctrl", "shift", "alt"].includes(k));
      // "meta" can be ignored. Looks like VSCode handles ESC in the terminal properly so that the problem above doesn't happen.
      // So the user can use ESC as a meta key in the terminal without issues.
      const hasMeta = keyElements.includes("meta");
      if (isUnconditional && hasModifiers && !hasMeta) {
        throw new Error(
          `Keybinding "${key}" has a modifier but is unconditional. It may cause issues in Emacs in the terminal. ` +
            `Consider adding "!terminalFocus" condition to the keybinding.`,
        );
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

  // Modify the keybindings so that they don't work when they are conflicting with priority keybindings such as `ctrl+v` in the find widget.
  keybindings.forEach((binding) => {
    if (binding.key && NO_FIND_EXIT_KEYS_WIN_LINUX.includes(binding.key)) {
      const isWinOrLinuxOrSomethingElse = "!isMac"; // Use negative cond of `isMac` to cover `isWeb` and other platforms.
      binding.when = addWhenCond(binding.when, `!(${isWinOrLinuxOrSomethingElse} && findWidgetVisible)`);
    }
    const macKey = binding.mac ?? binding.key;
    if (macKey && NO_FIND_EXIT_KEYS_MAC.includes(macKey)) {
      const isMacOrSomethingElse = "!(isLinux || isWindows)"; // Use negative cond of `isLinux || isWindows` to cover `isWeb` and other platforms.
      binding.when = addWhenCond(binding.when, `!(${isMacOrSomethingElse} && findWidgetVisible)`);
    }
  });

  // Add `isearchExit` keybindings if necessary
  if (src.isearchInterruptible === true || src.isearchInterruptible === "interruptOnly") {
    const isearchExitKeybindings: KeyBinding[] = [];
    keybindings.forEach((binding) => {
      if (binding.key != null) {
        const whenElements = [];
        whenElements.push("editorFocus && findWidgetVisible && !replaceInputFocussed && !isComposing");
        if (FIND_EDIT_KEYS.includes(binding.key)) {
          // Enable isearchExit for this key only when cursorMoveOnFindWidget is OFF.
          whenElements.unshift("!config.emacs-mcx.cursorMoveOnFindWidget");
        }
        if (NO_FIND_EXIT_KEYS_WIN_LINUX.includes(binding.key)) {
          // Enable isearchExit for this key when the platform is NOT win/linux.
          // In other platforms such as `isWeb`, disable isearchExit as a mild default.
          whenElements.unshift("isMac");
        }
        const macKey = binding.mac ?? binding.key;
        if (NO_FIND_EXIT_KEYS_MAC.includes(macKey)) {
          // Enable isearchExit for this key when the platform is NOT macOS.
          // In other platforms such as `isWeb`, disable isearchExit as a mild default.
          whenElements.unshift("(isLinux || isWindows)");
        }
        isearchExitKeybindings.push({
          key: binding.key,
          command: "emacs-mcx.isearchExit",
          when: whenElements.join(" && "),
          args:
            src.isearchInterruptible === "interruptOnly"
              ? undefined
              : {
                  then: src.command,
                },
        });
      }
    });
    keybindings.push(...isearchExitKeybindings);
  }

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
