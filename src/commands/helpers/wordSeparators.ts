import * as vscode from "vscode";
import { getMapForWordSeparators } from "vs/editor/common/controller/wordCharacterClassifier";

// Shared helper to honor editor.wordSeparators
export function getWordSeparators() {
  const activeTextEditor = vscode.window.activeTextEditor;
  const resource = activeTextEditor ? activeTextEditor.document.uri : null;
  const maybeWordSeparators = vscode.workspace.getConfiguration("editor", resource).wordSeparators as unknown;
  return getMapForWordSeparators(typeof maybeWordSeparators === "string" ? maybeWordSeparators : "");
}
