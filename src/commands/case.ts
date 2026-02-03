import { Position, Range, TextEditor } from "vscode";
import { EmacsCommand } from ".";
import { revealPrimaryActive } from "./helpers/reveal";
import { IEmacsController } from "../emulator";

async function transformWordInternal(
  emacsController: IEmacsController,
  textEditor: TextEditor,
  prefixArgument: number | undefined,
  transformer: (text: string) => string,
): Promise<void> {
  const oldPositions: Position[] = textEditor.selections.map((selection) => selection.active);
  await emacsController.runCommand("forwardWord", { prefixArgument });
  if (textEditor.selections.length != oldPositions.length) {
    return;
  }
  return textEditor
    .edit((editBuilder) => {
      textEditor.selections.forEach((selection, i) => {
        const range = new Range(oldPositions[i] as Position, selection.active);
        const text = textEditor.document.getText(range);
        editBuilder.replace(range, transformer(text));
      });
    })
    .then(() => {
      revealPrimaryActive(textEditor);
    });
}

const titleBoundary = new RegExp("(^|[^\\p{L}\\p{N}']|((^|\\P{L})'))\\p{L}", "gmu"); // Ref: https://github.com/microsoft/vscode/blob/238adc8bc607dd294a57e24b37073fbd939aaca9/src/vs/editor/contrib/linesOperations/browser/linesOperations.ts#L1218

export class TransformToTitlecase extends EmacsCommand {
  public readonly id = "transformToTitlecase";
  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    return transformWordInternal(this.emacsController, textEditor, prefixArgument, (text: string) => {
      return text.toLocaleLowerCase().replace(titleBoundary, (b) => b.toLocaleUpperCase()); // Ref: https://github.com/microsoft/vscode/blob/238adc8bc607dd294a57e24b37073fbd939aaca9/src/vs/editor/contrib/linesOperations/browser/linesOperations.ts#L1235-L1237
    });
  }
}

export class TransformToUppercase extends EmacsCommand {
  public readonly id = "transformToUppercase";
  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    return transformWordInternal(
      this.emacsController,
      textEditor,
      prefixArgument,
      (text: string) => text.toLocaleUpperCase(), // Use toLocaleUpperCase as same as https://github.com/microsoft/vscode/blob/238adc8bc607dd294a57e24b37073fbd939aaca9/src/vs/editor/contrib/linesOperations/browser/linesOperations.ts#L1167
    );
  }
}

export class TransformToLowercase extends EmacsCommand {
  public readonly id = "transformToLowercase";
  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    return transformWordInternal(
      this.emacsController,
      textEditor,
      prefixArgument,
      (text: string) => text.toLocaleLowerCase(), // Use toLocaleLowerCase as same as https://github.com/microsoft/vscode/blob/238adc8bc607dd294a57e24b37073fbd939aaca9/src/vs/editor/contrib/linesOperations/browser/linesOperations.ts#L1182
    );
  }
}
