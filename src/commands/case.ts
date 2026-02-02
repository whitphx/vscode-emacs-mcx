import { Position, Range, TextEditor } from "vscode";
import { EmacsCommand } from ".";
import { revealPrimaryActive } from "./helpers/reveal";
import { IEmacsController } from "./../emulator";

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
      let i = 0;
      textEditor.selections.forEach((selection) => {
        const range = new Range(oldPositions[i] as Position, selection.active);
        i++;
        const text = textEditor.document.getText(range);
        editBuilder.replace(range, transformer(text));
      });
    })
    .then(() => {
      revealPrimaryActive(textEditor);
    });
}

export class TransformToTitlecase extends EmacsCommand {
  public readonly id = "transformToTitlecase";
  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    return transformWordInternal(this.emacsController, textEditor, prefixArgument, (text: string) => {
      if (text.length == 0) {
        return text;
      }
      return text.charAt(0).toUpperCase() + text.substring(1).toLowerCase();
    });
  }
}

export class TransformToUppercase extends EmacsCommand {
  public readonly id = "transformToUppercase";
  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    return transformWordInternal(this.emacsController, textEditor, prefixArgument, (text: string) =>
      text.toUpperCase(),
    );
  }
}

export class TransformToLowercase extends EmacsCommand {
  public readonly id = "transformToLowercase";
  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    return transformWordInternal(this.emacsController, textEditor, prefixArgument, (text: string) =>
      text.toLowerCase(),
    );
  }
}
