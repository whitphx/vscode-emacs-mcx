import * as vscode from "vscode";
import { getMapForWordSeparators, WordCharacterClassifier } from "vs/editor/common/controller/wordCharacterClassifier";

export interface WordSeparatorsInfo {
  classifier: WordCharacterClassifier;
  subwordMode: boolean;
}

// Shared helper to honor editor.wordSeparators and emacs-mcx.subwordMode
export function getWordSeparators(document: vscode.TextDocument): WordSeparatorsInfo {
  // Ref: https://github.com/VSCodeVim/Vim/blob/91ca71f8607458c0558f9aff61e230c6917d4b51/src/configuration/configuration.ts#L155
  const resource = document.uri;
  const maybeWordSeparators = vscode.workspace.getConfiguration("editor", resource).wordSeparators as unknown;
  const subwordMode = (vscode.workspace.getConfiguration("emacs-mcx", resource).subwordMode as boolean) ?? false;

  // Ref: https://github.com/microsoft/vscode/blob/bc9f2577cd8e297b003e5ca652e19685504a1e50/src/vs/editor/contrib/wordOperations/wordOperations.ts#L45
  return {
    classifier: getMapForWordSeparators(typeof maybeWordSeparators === "string" ? maybeWordSeparators : ""),
    subwordMode,
  };
}
