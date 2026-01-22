import * as vscode from "vscode";
import { getMapForWordSeparators } from "vs/editor/common/controller/wordCharacterClassifier";
import { Configuration } from "../../configuration/configuration";

// Shared helper to honor editor.wordSeparators
export function getWordSeparators(document: vscode.TextDocument) {
  // Ref: https://github.com/VSCodeVim/Vim/blob/91ca71f8607458c0558f9aff61e230c6917d4b51/src/configuration/configuration.ts#L155
  const resource = document.uri;
  const maybeWordSeparators = vscode.workspace.getConfiguration("editor", resource).wordSeparators as unknown;
  // Ref: https://github.com/microsoft/vscode/blob/bc9f2577cd8e297b003e5ca652e19685504a1e50/src/vs/editor/contrib/wordOperations/wordOperations.ts#L45
  return getMapForWordSeparators(typeof maybeWordSeparators === "string" ? maybeWordSeparators : "");
}

export function getSubwordModeConfig(document: vscode.TextDocument): boolean {
  const resource = document.uri;
  const maybeSubwordMode = vscode.workspace.getConfiguration("emacs-mcx", resource).get<boolean>("subwordMode");
  return typeof maybeSubwordMode === "boolean" ? maybeSubwordMode : false;
}

export function shouldRespectSubwordMode(document: vscode.TextDocument): boolean {
  const wordNavigationStyle = Configuration.instance.wordNavigationStyle;
  return wordNavigationStyle === "emacs" && getSubwordModeConfig(document);
}
