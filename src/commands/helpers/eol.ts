import * as vscode from "vscode";

export function getEolChar(eol: vscode.EndOfLine): string {
  switch (eol) {
    case vscode.EndOfLine.CRLF:
      return "\r\n";
    case vscode.EndOfLine.LF:
      return "\n";
    default:
      return "\n";
  }
}
