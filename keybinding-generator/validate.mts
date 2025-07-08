import vm from "node:vm";
import { KeyBinding } from "./generate-keybindings.mjs";

/**
 * Evaluates a `when` condition string with the provided context **in a very rough way**.
 */
function evaluateWhenCondition(when: string, context: Record<string, boolean>, defaultValue: boolean): boolean {
  console.debug(`Evaluating when condition "${when}"`);
  let replacedWhen = when;
  for (const cond of Object.keys(context)) {
    // Replace `cond` with `true` in the when condition.
    replacedWhen = replacedWhen.replace(new RegExp(`\\b${cond}\\b`, "g"), context[cond] ? "true" : "false");
  }
  console.debug(`when condition whose values were replaced with specified boolean values: "${replacedWhen}"`);
  // Replace remaining conditions with the default value.
  replacedWhen = replacedWhen.replace(/[a-zA-Z-.]+/g, (match) => {
    if (match === "true" || match === "false") {
      return match; // Keep true/false as is.
    }
    return defaultValue ? "true" : "false"; // Replace other conditions with the default value.
  });
  console.debug(`when condition whose values were fully replaced with boolean values: ${replacedWhen}`);

  const whenScript = new vm.Script(replacedWhen);
  const result = whenScript.runInContext(vm.createContext({})) as unknown;
  if (typeof result !== "boolean") {
    throw new Error(`When condition "${when}" does not evaluate to boolean.`);
  }

  return result;
}

function cmdEditsInFindWidgetOnMac(keybindings: KeyBinding[]): string[] {
  const errors: string[] = [];

  // Keybindings that we want to use in the find widget on Mac
  // without being overridden by this extension's keybindings.
  const macCmdEditKeybindings = ["cmd+z", "cmd+x", "cmd+c", "cmd+v"];

  keybindings.forEach((binding) => {
    if (!macCmdEditKeybindings.some((k) => k === binding.mac)) {
      return;
    }
    if (binding.when == null) {
      // Unconditionally active.
      errors.push(
        `Keybinding "${binding.mac}" on Mac is activated unconditionally, which may leads to conflicting with edit/move keybindings in find widget.`,
      );
      return;
    }

    const context = {
      isMac: true,
      isWindows: false,
      isLinux: false,
      editorTextFocus: true,
      editorReadonly: false,
      suggestWidgetVisible: false,
      terminalFocus: false,
      findWidgetVisible: true,
      findInputFocussed: true,
      replaceInputFocussed: false,
    };
    const when = binding.when;

    // Check both cases: with and without `useMetaPrefixMacCmd`.
    [true, false].forEach((useMetaPrefixMacCmd) => {
      const isMatched = evaluateWhenCondition(
        when,
        {
          ...context,
          "config.emacs-mcx.useMetaPrefixMacCmd": useMetaPrefixMacCmd,
        },
        true,
      );
      if (isMatched) {
        errors.push(
          `Keybinding "${binding.mac}" on Mac is activated in find widget, which may leads to conflicting with edit/move keybindings in find widget.`,
        );
        return;
      }
    });
  });
  return errors;
}

function emacsLikeKeybindingsInFindWidgetOnAllPlatforms(keybindings: KeyBinding[]): string[] {
  const errors: string[] = [];

  const emacsLikeKeybindings = ["ctrl+f", "ctrl+b", "ctrl+p", "ctrl+n", "ctrl+a", "ctrl+e"];

  keybindings.forEach((binding) => {
    if (!emacsLikeKeybindings.some((k) => k === binding.key)) {
      return;
    }
    if (binding.when == null) {
      // Unconditionally active.
      errors.push(
        `Keybinding "${binding.key}" is activated unconditionally, which may leads to conflicting with edit/move keybindings in find widget.`,
      );
      return;
    }

    const context = {
      editorTextFocus: true,
      editorReadonly: false,
      suggestWidgetVisible: false,
      terminalFocus: false,
      findWidgetVisible: true,
      findInputFocussed: true,
      replaceInputFocussed: false,
      "config.emacs-mcx.cursorMoveOnFindWidget": true,
      isComposing: false,
    };
    const when = binding.when;

    // Emacs-like keybindings such as `ctrl+f` should be no-op in the find widget
    // when `config.emacs-mcx.cursorMoveOnFindWidget` is true.
    ["windows", "mac", "linux", "web"].forEach((platform) => {
      const isMatched = evaluateWhenCondition(
        when,
        {
          ...context,
          isWindows: platform === "windows",
          isMac: platform === "mac",
          isLinux: platform === "linux",
          isWeb: platform === "web",
        },
        true,
      );
      if (isMatched) {
        errors.push(
          `Keybinding "${binding.key}" with "${when}" on ${platform} is activated in find widget, which may leads to conflicting with edit/move keybindings in find widget.`,
        );
        return;
      }
    });

    // `isearchExit` assigned to Emacs-like keybindings such as `ctrl+f` should work in the find widget
    // when `config.emacs-mcx.cursorMoveOnFindWidget` is false.
    if (binding.command === "emacs-mcx.isearchExit") {
      // `isearchExit` keybindings were added above and already taking care of `config.emacs-mcx.cursorMoveOnFindWidget`.
      ["windows", "mac", "linux", "web"].forEach((platform) => {
        const isMatched = evaluateWhenCondition(
          when,
          {
            ...context,
            isWindows: platform === "windows",
            isMac: platform === "mac",
            isLinux: platform === "linux",
            isWeb: platform === "web",
            "config.emacs-mcx.cursorMoveOnFindWidget": false,
          },
          true,
        );
        if (!isMatched) {
          errors.push(
            `Keybinding "${binding.key}" with "${when}" on ${platform} should be activated in find widget but it may not.`,
          );
          return;
        }
      });
    }
  });

  return errors;
}

export function validate(keybindings: KeyBinding[]) {
  // NOTE: This validation process is not perfect.
  // We define ad-hoc rules to detect potential issues in keybindings.
  // We haven't paid so much care about reducing false positives,
  // focusing on detecting possible issues.

  const errors: string[] = [];
  errors.push(...cmdEditsInFindWidgetOnMac(keybindings));
  errors.push(...emacsLikeKeybindingsInFindWidgetOnAllPlatforms(keybindings));

  if (errors.length > 0) {
    throw new Error("Keybinding validation failed:\n" + errors.join("\n"));
  }
}
