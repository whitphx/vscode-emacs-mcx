import { TextDocument, Position } from "vscode";
import { WordCharacterClass, WordCharacterClassifier } from "vs/editor/common/controller/wordCharacterClassifier";

// Derived from https://github.com/microsoft/vscode/blob/246aab4a05c5f314b1711dac9e775921e93e786e/src/vs/editor/common/controller/cursorWordOperations.ts

const enum WordType {
  None = 0,
  Regular = 1,
  Separator = 2,
}

interface IFindWordResult {
  /**
   * The index where the word starts.
   */
  start: number;
  /**
   * The index where the word ends.
   */
  end: number;
  /**
   * The word type.
   */
  wordType: WordType;
  /**
   * The reason the word ended.
   */
  nextCharClass: WordCharacterClass;
}

function createWord(
  lineContent: string,
  wordType: WordType,
  nextCharClass: WordCharacterClass,
  start: number,
  end: number,
): IFindWordResult {
  // console.log('WORD ==> ' + start + ' => ' + end + ':::: <<<' + lineContent.substring(start, end) + '>>>');
  return { start: start, end: end, wordType: wordType, nextCharClass: nextCharClass };
}

function findEndOfWord(
  lineContent: string,
  wordSeparators: WordCharacterClassifier,
  wordType: WordType,
  startIndex: number,
): number {
  const len = lineContent.length;
  for (let chIndex = startIndex; chIndex < len; chIndex++) {
    const chCode = lineContent.charCodeAt(chIndex);
    const chClass = wordSeparators.get(chCode);

    if (chClass === WordCharacterClass.Whitespace) {
      return chIndex;
    }
    if (wordType === WordType.Regular && chClass === WordCharacterClass.WordSeparator) {
      return chIndex;
    }
    if (wordType === WordType.Separator && chClass === WordCharacterClass.Regular) {
      return chIndex;
    }
  }
  return len;
}

function findPreviousWordOnLine(
  lineContent: string,
  wordSeparators: WordCharacterClassifier,
  position: Position,
): IFindWordResult | null {
  let wordType = WordType.None;
  for (let chIndex = position.character - 1; chIndex >= 0; chIndex--) {
    const chCode = lineContent.charCodeAt(chIndex);
    const chClass = wordSeparators.get(chCode);

    if (chClass === WordCharacterClass.Regular) {
      if (wordType === WordType.Separator) {
        return createWord(
          lineContent,
          wordType,
          chClass,
          chIndex + 1,
          findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1),
        );
      }
      wordType = WordType.Regular;
    } else if (chClass === WordCharacterClass.WordSeparator) {
      if (wordType === WordType.Regular) {
        return createWord(
          lineContent,
          wordType,
          chClass,
          chIndex + 1,
          findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1),
        );
      }
      wordType = WordType.Separator;
    } else if (chClass === WordCharacterClass.Whitespace) {
      if (wordType !== WordType.None) {
        return createWord(
          lineContent,
          wordType,
          chClass,
          chIndex + 1,
          findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1),
        );
      }
    }
  }

  if (wordType !== WordType.None) {
    return createWord(
      lineContent,
      wordType,
      WordCharacterClass.Whitespace,
      0,
      findEndOfWord(lineContent, wordSeparators, wordType, 0),
    );
  }

  return null;
}

function findStartOfWord(
  lineContent: string,
  wordSeparators: WordCharacterClassifier,
  wordType: WordType,
  startIndex: number,
): number {
  for (let chIndex = startIndex; chIndex >= 0; chIndex--) {
    const chCode = lineContent.charCodeAt(chIndex);
    const chClass = wordSeparators.get(chCode);

    if (chClass === WordCharacterClass.Whitespace) {
      return chIndex + 1;
    }
    if (wordType === WordType.Regular && chClass === WordCharacterClass.WordSeparator) {
      return chIndex + 1;
    }
    if (wordType === WordType.Separator && chClass === WordCharacterClass.Regular) {
      return chIndex + 1;
    }
  }
  return 0;
}

function findNextWordOnLine(
  lineContent: string,
  wordSeparators: WordCharacterClassifier,
  position: Position,
): IFindWordResult | null {
  let wordType = WordType.None;
  const len = lineContent.length;

  for (let chIndex = position.character; chIndex < len; chIndex++) {
    const chCode = lineContent.charCodeAt(chIndex);
    const chClass = wordSeparators.get(chCode);

    if (chClass === WordCharacterClass.Regular) {
      if (wordType === WordType.Separator) {
        return createWord(
          lineContent,
          wordType,
          chClass,
          findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1),
          chIndex,
        );
      }
      wordType = WordType.Regular;
    } else if (chClass === WordCharacterClass.WordSeparator) {
      if (wordType === WordType.Regular) {
        return createWord(
          lineContent,
          wordType,
          chClass,
          findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1),
          chIndex,
        );
      }
      wordType = WordType.Separator;
    } else if (chClass === WordCharacterClass.Whitespace) {
      if (wordType != WordType.None) {
        return createWord(
          lineContent,
          wordType,
          chClass,
          findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1),
          chIndex,
        );
      }
    }
  }

  if (wordType !== WordType.None) {
    return createWord(
      lineContent,
      wordType,
      WordCharacterClass.Whitespace,
      findStartOfWord(lineContent, wordSeparators, wordType, len - 1),
      len,
    );
  }

  return null;
}

// Based on `moveWordRight` method with `wordNavigationType = WordNavigationType.WordEnd`
// https://github.com/microsoft/vscode/blob/0fbda8ef061b5e86904a3c4265c9f3ee0903b7fd/src/vs/editor/common/controller/cursorWordOperations.ts#L252
// https://github.com/microsoft/vscode/blob/0fbda8ef061b5e86904a3c4265c9f3ee0903b7fd/src/vs/editor/contrib/wordOperations/wordOperations.ts#L245
export function findNextWordEnd(
  doc: TextDocument,
  wordSeparators: WordCharacterClassifier,
  position: Position,
): Position {
  let lineNumber = position.line;
  let character = position.character;

  if (character === doc.lineAt(lineNumber).range.end.character) {
    if (lineNumber < doc.lineCount - 1) {
      lineNumber = lineNumber + 1;
      character = 0;
    }
  }

  let nextWordOnLine = findNextWordOnLine(
    doc.lineAt(lineNumber).text,
    wordSeparators,
    new Position(lineNumber, character),
  );

  // Emacs-like behavior that does not stop word search at line breaks.
  if (
    nextWordOnLine &&
    nextWordOnLine.wordType === WordType.Separator &&
    lineNumber < doc.lineCount - 1 &&
    nextWordOnLine.end === doc.lineAt(lineNumber).range.end.character
  ) {
    lineNumber = lineNumber + 1;
    character = 0;
    nextWordOnLine = findNextWordOnLine(
      doc.lineAt(lineNumber).text,
      wordSeparators,
      new Position(lineNumber, character),
    );
  }

  if (nextWordOnLine && nextWordOnLine.wordType === WordType.Separator) {
    if (
      nextWordOnLine.end - nextWordOnLine.start === 1 &&
      nextWordOnLine.nextCharClass === WordCharacterClass.Regular
    ) {
      // Skip over a word made up of one single separator and followed by a regular character
      nextWordOnLine = findNextWordOnLine(
        doc.lineAt(lineNumber).text,
        wordSeparators,
        new Position(lineNumber, nextWordOnLine.end),
      );
    }
  }
  if (nextWordOnLine) {
    character = nextWordOnLine.end;
  } else {
    character = doc.lineAt(lineNumber).range.end.character;
  }

  return new Position(lineNumber, character);
}

// Based on `moveWordLeft` method with `wordNavigationType = WordNavigationType.WordStartFast` that is called via `CursorWordLeft` command.
// https://github.com/microsoft/vscode/blob/0fbda8ef061b5e86904a3c4265c9f3ee0903b7fd/src/vs/editor/common/controller/cursorWordOperations.ts#L163
// https://github.com/microsoft/vscode/blob/0fbda8ef061b5e86904a3c4265c9f3ee0903b7fd/src/vs/editor/contrib/wordOperations/wordOperations.ts#L120
export function findPreviousWordStart(
  doc: TextDocument,
  wordSeparators: WordCharacterClassifier,
  position: Position,
): Position {
  let lineNumber = position.line;
  let character = position.character;

  if (character === 0) {
    if (lineNumber > 0) {
      lineNumber = lineNumber - 1;
      character = doc.lineAt(lineNumber).range.end.character;
    }
  }

  let prevWordOnLine = findPreviousWordOnLine(
    doc.lineAt(lineNumber).text,
    wordSeparators,
    new Position(lineNumber, character),
  );

  // Emacs-like behavior that does not stop word search at line breaks.
  if (
    prevWordOnLine &&
    prevWordOnLine.wordType === WordType.Separator &&
    lineNumber > 0 &&
    prevWordOnLine.start === 0
  ) {
    lineNumber = lineNumber - 1;
    prevWordOnLine = findPreviousWordOnLine(
      doc.lineAt(lineNumber).text,
      wordSeparators,
      doc.lineAt(lineNumber).range.end,
    );
  }

  if (
    prevWordOnLine &&
    prevWordOnLine.wordType === WordType.Separator &&
    prevWordOnLine.end - prevWordOnLine.start === 1 &&
    prevWordOnLine.nextCharClass === WordCharacterClass.Regular
  ) {
    // Skip over a word made up of one single separator and followed by a regular character
    prevWordOnLine = findPreviousWordOnLine(
      doc.lineAt(lineNumber).text,
      wordSeparators,
      new Position(lineNumber, prevWordOnLine.start),
    );
  }

  return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.start : 0);
}
