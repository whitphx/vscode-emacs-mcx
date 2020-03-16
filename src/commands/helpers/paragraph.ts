import { TextDocument, Position } from "vscode";

export function travelForward(document: TextDocument, pos: Position): Position {
  let nonEmptyFound = false;
  let lineIdx = pos.line;

  for (;;) {
    const line = document.lineAt(lineIdx);
    if (nonEmptyFound && line.isEmptyOrWhitespace) {
      break;
    }
    if (!line.isEmptyOrWhitespace) {
      nonEmptyFound = true;
    }
    if (lineIdx === document.lineCount - 1) {
      break;
    }
    ++lineIdx;
  }

  return document.lineAt(lineIdx).range.end;
}

export function travelBackward(document: TextDocument, pos: Position): Position {
  let nonEmptyFound = false;
  let lineIdx = pos.line;

  for (;;) {
    const line = document.lineAt(lineIdx);
    if (nonEmptyFound && line.isEmptyOrWhitespace) {
      break;
    }
    if (!line.isEmptyOrWhitespace) {
      nonEmptyFound = true;
    }
    if (lineIdx === 0) {
      break;
    }
    --lineIdx;
  }

  return document.lineAt(lineIdx).range.start;
}
