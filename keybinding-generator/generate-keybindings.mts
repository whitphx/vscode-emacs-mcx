import {
  getVscDefaultKeybindingWhenCondition,
  getVscDefaultKeybindingsSet,
  VscKeybinding,
} from "./vsc-default-keybindings.mjs";
import { addWhenCond } from "./utils.mjs";

export interface KeyBindingSource {
  key?: string;
  keys?: string[];
  command?: string;
  when?: string;
  whens?: string[];
  inheritWhenFromDefault?: boolean;
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

function replaceAll(src: string, search: string, replacement: string) {
  return src.split(search).join(replacement); // split + join = replaceAll
}

// Keys that should be left unbound in the find widget when `config.emacs-mcx.cursorMoveOnFindWidget` is true.
const FIND_EDIT_KEYS = [
  "right",
  "left",
  "up",
  "down",
  "home",
  "end",
  "ctrl+f",
  "ctrl+b",
  "ctrl+p",
  "ctrl+n",
  "ctrl+a",
  "ctrl+e",
  "meta+f", // forward-word
  "meta+b", // backward-word
  "meta+m",
  "ctrl+right", // right-word
  "meta+right", // right-word
  "meta+left", // left-word
  "ctrl+left", // left-word
];
const NO_FIND_EXIT_KEYS_WIN_LINUX = ["ctrl+z", "ctrl+x", "ctrl+c", "ctrl+v"];
const NO_FIND_EXIT_KEYS_MAC = ["cmd+z", "cmd+x", "cmd+c", "cmd+v"];

function compileKeybinding(opts: { key: string; command?: string; when?: string; args?: unknown }): KeyBinding[] {
  const { key, command, when, args } = opts;
  const keybindings: KeyBinding[] = [];

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
      command,
      when: addWhenCond(when, "config.emacs-mcx.useMetaPrefixAlt"),
      ...(args !== undefined ? { args } : {}),
    });

    // Generate a keybinding using CMD as meta for macOS.
    keybindings.push({
      mac: replaceAll(key, "meta", "cmd"),
      command,
      when: addWhenCond(when, "config.emacs-mcx.useMetaPrefixMacCmd"),
      ...(args !== undefined ? { args } : {}),
    });

    // Generate keybindings using ESC and Ctrl+[ as meta.
    const keystrokes = key.split(" ").filter((k) => k);
    if (keystrokes.length === 1) {
      const keyWithEscapeMeta = replaceMetaWithEscape(key);
      keybindings.push({
        key: keyWithEscapeMeta,
        command,
        when: addWhenCond(when, "config.emacs-mcx.useMetaPrefixEscape"),
        ...(args !== undefined ? { args } : {}),
      });
      keybindings.push({
        key: keyWithEscapeMeta.replace("escape", "ctrl+["),
        command,
        when: addWhenCond(when, "config.emacs-mcx.useMetaPrefixCtrlLeftBracket"),
        ...(args !== undefined ? { args } : {}),
      });
    } else {
      console.warn(
        `"${key}" includes more than one key strokes then it's meta key specification cannot be converted to "ESC" and "ctrl+[".`,
      );
    }
  } else {
    keybindings.push({
      key,
      command,
      when,
      ...(args !== undefined ? { args } : {}),
    });
  }

  return keybindings;
}

function getKeys(src: KeyBindingSource): string[] {
  if (src.key) {
    if (src.keys) {
      throw new Error(`Both .key and .keys are provided while just one of them should be.`);
    }
    return [src.key];
  } else if (src.keys) {
    return src.keys;
  } else {
    throw new Error(`Neither .key nor .keys are provided: ${JSON.stringify(src)}`);
  }
}

export function generateKeybindings(src: KeyBindingSource): KeyBinding[] {
  const keys = getKeys(src);

  let whens: (string | undefined)[] = [];
  if (src.inheritWhenFromDefault) {
    if (src.when || src.whens) {
      throw new Error("inheritWhenFromDefault can't be used with .when or .whens");
    }
    const command = src.command;
    if (command == null) {
      throw new Error(`command must be defined when inheritWhenFromDefault = true`);
    }
    const defaultKeybindingWhen = getVscDefaultKeybindingWhenCondition(command);
    if (defaultKeybindingWhen == null) {
      throw new Error(`Command "${command}" was not found in the default keybindings`);
    }
    whens = [defaultKeybindingWhen];
  }
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
      keybindings.push(
        ...compileKeybinding({
          key,
          command: src.command,
          when,
          args: src.args,
        }),
      );
    });
  });

  // Modify the keybindings so that they don't work when they are conflicting with priority keybindings such as `ctrl+v` in the find widget.
  keybindings.forEach((binding) => {
    if (binding.key && NO_FIND_EXIT_KEYS_WIN_LINUX.includes(binding.key)) {
      const isWinLinuxOrLike = "!isMac"; // Use negative cond of `isMac` to cover `isWeb` and other platforms in addition to Windows and Linux.
      binding.when = addWhenCond(binding.when, `!(${isWinLinuxOrLike} && (findInputFocussed || replaceInputFocussed))`);
    }
    const macKey = binding.mac ?? binding.key;
    if (macKey && NO_FIND_EXIT_KEYS_MAC.includes(macKey)) {
      if (binding.key == null) {
        // If `key` is null, it means this binding is for macOS.
        binding.when = addWhenCond(binding.when, `!findInputFocussed && !replaceInputFocussed`);
      } else {
        const isMacOrSomethingElse = "!(isLinux || isWindows)"; // Use negative cond of `isLinux || isWindows` to cover `isWeb` and other platforms.
        binding.when = addWhenCond(
          binding.when,
          `!(${isMacOrSomethingElse} && !findInputFocussed && !replaceInputFocussed)`,
        );
      }
    }
  });

  // Add isearchExit keybindings for isearchInterruptible commands.
  const isearchExitKeybindings: KeyBinding[] = [];
  if (src.isearchInterruptible === true || src.isearchInterruptible === "interruptOnly") {
    const keys = getKeys(src);
    keys.forEach((key) => {
      const whenElements = [];
      if (FIND_EDIT_KEYS.includes(key)) {
        // Enable isearchExit for this key only when cursorMoveOnFindWidget is OFF.
        whenElements.push("!config.emacs-mcx.cursorMoveOnFindWidget");
      }

      whenElements.push(
        ...[
          "editorFocus",
          "findWidgetVisible",
          "!replaceInputFocussed", // In the original Emacs, navigation keys work in the minibuffer when replacing. Ref: https://github.com/whitphx/vscode-emacs-mcx/pull/466
          "!isComposing", // `isComposing` is necessary to avoid closing the find widget when using IME. Ref: https://github.com/whitphx/vscode-emacs-mcx/pull/549
        ],
      );
      const isearchExitKeybindingsForThisKey = compileKeybinding({
        key,
        command: "emacs-mcx.isearchExit",
        when: whenElements.join(" && "),
        args:
          src.isearchInterruptible === "interruptOnly"
            ? undefined
            : {
                then: src.command,
              },
      });
      isearchExitKeybindingsForThisKey.forEach((binding) => {
        if (binding.key && NO_FIND_EXIT_KEYS_WIN_LINUX.includes(binding.key)) {
          binding.when = addWhenCond(binding.when, `isMac`);
        }
        const macKey = binding.mac ?? binding.key;
        if (macKey && NO_FIND_EXIT_KEYS_MAC.includes(macKey)) {
          if (binding.key == null) {
            // binding has only mac keybinding and it's conflicting with a priority keybinding. So delete it.
            binding.command = undefined;
          } else {
            // `binding.mac` is conflicting with a priority keybinding, so delete it.
            binding.mac = undefined;
          }
        }
      });
      isearchExitKeybindings.push(...isearchExitKeybindingsForThisKey.filter((b) => b.command != null));
    });
  }

  keybindings.push(...isearchExitKeybindings);

  return keybindings;
}

export function isKeyBindingSource(obj: unknown): obj is KeyBindingSource {
  if (obj == null || typeof obj !== "object") {
    return false;
  }
  const maybeSrc = obj as Record<string, unknown>;

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
      ...compileKeybinding({
        key: num.toString(),
        command: "emacs-mcx.subsequentArgumentDigit",
        when: "emacs-mcx.acceptingArgument && editorTextFocus",
        args: num,
      }),
    );
    keybindings.push(
      ...compileKeybinding({
        key: `meta+${num.toString()}`,
        command: "emacs-mcx.subsequentArgumentDigit",
        when: "emacs-mcx.acceptingArgument && editorTextFocus && config.emacs-mcx.enableDigitArgument",
        args: num,
      }),
    );
    keybindings.push(
      ...compileKeybinding({
        key: `meta+${num.toString()}`,
        command: "emacs-mcx.digitArgument",
        when: "!emacs-mcx.acceptingArgument && editorTextFocus && config.emacs-mcx.enableDigitArgument",
        args: num,
      }),
    );
    keybindings.push({
      key: num.toString(),
      command: "emacs-mcx.typeChar",
      when: "!emacs-mcx.acceptingArgument && emacs-mcx.prefixArgumentExists && editorTextFocus",
      args: num.toString(),
    });
  }

  // M--
  keybindings.push(
    ...compileKeybinding({
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
      args: char,
    });
  }

  // In addition, special characters.
  keybindings.push({
    key: "space",
    when: "emacs-mcx.prefixArgumentExists && editorTextFocus && !editorReadonly",
    command: "emacs-mcx.typeChar",
    args: " ",
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
      args: char,
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

export function generateCtrlGKeybindings(): KeyBinding[] {
  const { allPlatforms, linuxSpecific, winSpecific, osxSpecific } = getVscDefaultKeybindingsSet(false);

  function getCtrlGKeybindings(keybindings: VscKeybinding[], additionalWhen?: string): KeyBinding[] {
    // Exclude keybindings that conflict with Emacs keybindings or seem to be not useful when assigned to `ctrl+g`.
    const conflictedCommands = [
      "cancelSelection", // emacs-mcx.cancel
      "removeSecondaryCursors", // emacs-mcx.cancel
      "editor.action.cancelSelectionAnchor", // emacs-mcx.cancel
      "closeFindWidget", // emacs-mcx.isearchAbort
      "closeReplaceInFilesWidget", // emacs-mcx.isearchAbort
      "keybindings.editor.rejectWhenExpression", // not sure what this command is, but remove it just in case.
    ];
    return keybindings
      .filter((binding) => binding.key === "escape" && !binding.command.startsWith("emacs-mcx."))
      .filter((binding) => {
        return !conflictedCommands.includes(binding.command);
      })
      .flatMap((binding) => {
        const when = additionalWhen ? addWhenCond(binding.when, additionalWhen) : binding.when;
        return [
          {
            key: "ctrl+g",
            command: binding.command,
            when,
            args: binding.args,
          },
          // When config.emacs-mcx.useMetaPrefixEscape is true where ESC is used as a Meta key,
          // assign `ESC ESC ESC` to `emacs-mcx.cancel` because ESC no longer works as a cancel key.
          // `ESC ESC ESC` is actually used for such purposes in the original Emacs, Ref: https://www.gnu.org/software/emacs/manual/html_node/emacs/Quitting.html
          // while `ESC ESC ESC` on original Emacs is bound to `keyboard-escape-quit` that is different from `C-g`,
          // but we assign it to the same cancel commands for now because we don't have needs to distinguish them.
          {
            key: "escape escape escape",
            command: binding.command,
            when: addWhenCond(when, "config.emacs-mcx.useMetaPrefixEscape"),
            args: binding.args,
          },
        ];
      });
  }
  const allPlatformsCtrlGKeybindings = getCtrlGKeybindings(allPlatforms);
  const linuxSpecificCtrlGKeybindings = getCtrlGKeybindings(linuxSpecific, "isLinux");
  const winSpecificCtrlGKeybindings = getCtrlGKeybindings(winSpecific, "isWindows");
  const osxSpecificCtrlGKeybindings = getCtrlGKeybindings(osxSpecific, "isMac");

  return allPlatformsCtrlGKeybindings
    .concat(linuxSpecificCtrlGKeybindings)
    .concat(winSpecificCtrlGKeybindings)
    .concat(osxSpecificCtrlGKeybindings);
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
