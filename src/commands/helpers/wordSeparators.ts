import * as vscode from "vscode";
import { getMapForWordSeparators } from "vs/editor/common/controller/wordCharacterClassifier";

// Shared helper to honor editor.wordSeparators
export function getWordSeparators() {
  // Ref: https://github.com/VSCodeVim/Vim/blob/91ca71f8607458c0558f9aff61e230c6917d4b51/src/configuration/configuration.ts#L155
  const activeTextEditor = vscode.window.activeTextEditor;
  const resource = activeTextEditor ? activeTextEditor.document.uri : null;
  const maybeWordSeparators = vscode.workspace.getConfiguration("editor", resource).wordSeparators as unknown;
  // Ref: https://github.com/microsoft/vscode/blob/bc9f2577cd8e297b003e5ca652e19685504a1e50/src/vs/editor/contrib/wordOperations/wordOperations.ts#L45
  return getMapForWordSeparators(typeof maybeWordSeparators === "string" ? maybeWordSeparators : "");
}
