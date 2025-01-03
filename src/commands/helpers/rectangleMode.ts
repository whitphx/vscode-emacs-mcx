/**
 * Helper functions for handling rectangle mode operations.
 * Centralizes common rectangle mode functionality used across commands.
 */

import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { IEmacsController } from "../../emulator";
import { revealPrimaryActive } from "./reveal";

/**
 * Executes an operation in rectangle mode or normal mode based on current state.
 * @param emacsController - The emacs controller instance
 * @param textEditor - The active text editor
 * @param isInMarkMode - Whether mark mode is active
 * @param rectHandler - Function to handle rectangle mode case
 * @param normalHandler - Function to handle normal mode case
 */
export function handleRectangleMode(
  emacsController: IEmacsController,
  textEditor: TextEditor,
  isInMarkMode: boolean,
  rectHandler: () => void,
  normalHandler: () => void,
): void {
  if (emacsController.inRectMarkMode) {
    rectHandler();
  } else {
    normalHandler();
  }
}

/**
 * Creates new selections based on current mode and positions.
 * @param textEditor - The active text editor
 * @param isInMarkMode - Whether mark mode is active
 * @param getNewActive - Function to compute new active position
 * @returns Array of new selections
 */
export function createNewSelections(
  textEditor: TextEditor,
  isInMarkMode: boolean,
  getNewActive: (selection: vscode.Selection) => vscode.Position,
): vscode.Selection[] {
  const newSelections = textEditor.selections.map((selection) => {
    const newActive = getNewActive(selection);
    return new vscode.Selection(isInMarkMode ? selection.anchor : newActive, newActive);
  });
  textEditor.selections = newSelections;
  revealPrimaryActive(textEditor);
  return newSelections;
}
