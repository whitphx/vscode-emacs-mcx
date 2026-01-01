/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/base/common/charCode';
import { CharacterClassifier } from 'vs/editor/common/core/characterClassifier';

export const enum WordCharacterClass {
	Regular = 0,
	Whitespace = 1,
	WordSeparator = 2
}

export class WordCharacterClassifier extends CharacterClassifier<WordCharacterClass> {
	// If subwordMode=true, wordSeparators are ignored. Instead, word boundaries are detected using a hard-coded regexp
	// in wordOperations.ts
	constructor(wordSeparators: string, readonly subwordMode: boolean) {
		super(WordCharacterClass.Regular);

		for (let i = 0, len = wordSeparators.length; i < len; i++) {
			this.set(wordSeparators.charCodeAt(i), WordCharacterClass.WordSeparator);
		}

		this.set(CharCode.Space, WordCharacterClass.Whitespace);
		this.set(CharCode.Tab, WordCharacterClass.Whitespace);
	}

}

function once<R>(computeFn: (input: string, subwordMode: boolean) => R): (input: string, subwordMode: boolean) => R {
	let cache: { [key: string]: R; } = {}; // TODO@Alex unbounded cache
	return (input: string, subwordMode: boolean): R => {
		if (!cache.hasOwnProperty(`${input}XX${subwordMode}`)) {
			cache[input] = computeFn(input, subwordMode);
		}
		return cache[input]!;
	};
}

export const getMapForWordSeparators = once<WordCharacterClassifier>(
	(input, subwordMode) => new WordCharacterClassifier(input, subwordMode)
);
