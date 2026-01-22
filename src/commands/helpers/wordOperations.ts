import { Position, TextDocument } from "vscode";
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
function findNextWordEndInternal(
  doc: TextDocument,
  wordSeparators: WordCharacterClassifier,
  position: Position,
  allowCrossLineWordNavigation: boolean,
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
    allowCrossLineWordNavigation &&
    nextWordOnLine &&
    nextWordOnLine.wordType === WordType.Separator &&
    lineNumber < doc.lineCount - 1 &&
    nextWordOnLine.end === doc.lineAt(lineNumber).range.end.character
  ) {
    let nextNonEmptyLine = lineNumber + 1;
    while (nextNonEmptyLine < doc.lineCount && doc.lineAt(nextNonEmptyLine).isEmptyOrWhitespace) {
      nextNonEmptyLine = nextNonEmptyLine + 1;
    }
    lineNumber = nextNonEmptyLine;
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

// Based on Emacs's subword-forward-internal ( https://github.com/emacs-mirror/emacs/blob/f2250ba24400c71040fbfb6e9c2f90b1f87dbb59/lisp/progmodes/subword.el#L282 )
function findNextSubwordEndInternal(doc: TextDocument, position: Position): Position | null {
  const regexp = /\W*(([A-Z]*(\W?))[a-z\d]*)/dg;
  const line = doc.lineAt(position).text.substring(position.character);
  const [range0, range1, range2, range3] = regexp.exec(line)?.indices ?? [];
  if (!range0 || !range1 || !range2 || !range3 || range0[1] === 0) {
    // No match.
    return null;
  }
  // If we have an all-caps word (e.g., "URL" in "getURLString") with a following
  // lowercase letter, stop before the last uppercase char to leave it for the next subword.
  // This handles: "getURL|String" instead of "getURLS|tring"
  if (range2[1] - range2[0] > 1 && !(range3[1] <= range3[0] && range2[1] === range1[1])) {
    return new Position(position.line, position.character + range3[1] - 1);
  }
  return new Position(position.line, position.character + range0[1]);
}

export function findNextWordEnd(
  doc: TextDocument,
  wordSeparators: WordCharacterClassifier,
  position: Position,
  allowCrossLineWordNavigation: boolean,
  subwordMode: boolean = false,
): Position {
  if (subwordMode) {
    const nextPosition = findNextSubwordEndInternal(doc, position);
    if (nextPosition) {
      return nextPosition;
    }
    // Fall through.
  }
  return findNextWordEndInternal(doc, wordSeparators, position, allowCrossLineWordNavigation);
}

// Based on `moveWordLeft` method with `wordNavigationType = WordNavigationType.WordStartFast` that is called via `CursorWordLeft` command.
// https://github.com/microsoft/vscode/blob/0fbda8ef061b5e86904a3c4265c9f3ee0903b7fd/src/vs/editor/common/controller/cursorWordOperations.ts#L163
// https://github.com/microsoft/vscode/blob/0fbda8ef061b5e86904a3c4265c9f3ee0903b7fd/src/vs/editor/contrib/wordOperations/wordOperations.ts#L120
function findPreviousWordStartInternal(
  doc: TextDocument,
  wordSeparators: WordCharacterClassifier,
  position: Position,
  allowCrossLineWordNavigation: boolean,
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

  if (allowCrossLineWordNavigation && !prevWordOnLine && lineNumber > 0) {
    // Skip empty/whitespace-only lines when crossing lines.
    do {
      lineNumber = lineNumber - 1;
      prevWordOnLine = findPreviousWordOnLine(
        doc.lineAt(lineNumber).text,
        wordSeparators,
        doc.lineAt(lineNumber).range.end,
      );
    } while (!prevWordOnLine && lineNumber > 0);
  }

  // Emacs-like behavior that does not stop word search at line breaks.
  if (
    allowCrossLineWordNavigation &&
    prevWordOnLine &&
    prevWordOnLine.wordType === WordType.Separator &&
    lineNumber > 0 &&
    prevWordOnLine.start === 0
  ) {
    let prevNonEmptyLine = lineNumber - 1;
    while (prevNonEmptyLine >= 0 && doc.lineAt(prevNonEmptyLine).isEmptyOrWhitespace) {
      prevNonEmptyLine = prevNonEmptyLine - 1;
    }
    lineNumber = prevNonEmptyLine;
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

// Based on Emacs's subword-backward-internal ( https://github.com/emacs-mirror/emacs/blob/f2250ba24400c71040fbfb6e9c2f90b1f87dbb59/lisp/progmodes/subword.el#L302 )
function findPreviousSubwordStartInternal(lineContent: string, position: Position): Position | null {
  const regexp = /((\W|[a-z\d])([A-Z]+\W*)|\W\w+)/dg;
  // Find the last regexp match before the position.
  const matches = [...lineContent.substring(0, position.character).matchAll(regexp)];
  const [range0, range1, range2, range3] = matches[matches.length - 1]?.indices ?? [];

  if (!range0 || !range1 || !range2 || !range3) {
    return null;
  }
  // For all-caps sequences (e.g., "URL" in "getURLString"), stop after keeping
  // the last uppercase char with the following subword: "get|URL|String" not "get|UR|LString"
  if (range3[1] - range3[0] > 1 && range3[1] < position.character) {
    return new Position(position.line, range3[1] - 1);
  }
  return new Position(position.line, range0[0] + 1);
}

export function findPreviousWordStart(
  doc: TextDocument,
  wordSeparators: WordCharacterClassifier,
  position: Position,
  allowCrossLineWordNavigation: boolean,
  subwordMode: boolean = false,
): Position {
  if (subwordMode) {
    const previousPosition = findPreviousSubwordStartInternal(doc.lineAt(position.line).text, position);
    if (previousPosition) {
      return previousPosition;
    }
    // Fall through.
  }
  return findPreviousWordStartInternal(doc, wordSeparators, position, allowCrossLineWordNavigation);
}
