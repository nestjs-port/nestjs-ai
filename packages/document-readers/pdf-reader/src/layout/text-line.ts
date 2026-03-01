import type { Character } from "./character";
import { ForkPdfLayoutTextStripper } from "./fork-pdf-layout-text-stripper";

export class TextLine {
  private static readonly SPACE_CHARACTER = " ";

  private readonly _lineLength: number;
  private readonly _line: string[];
  private _lastIndex = 0;

  constructor(lineLength: number) {
    if (lineLength < 0) {
      throw new Error("Line length cannot be negative");
    }

    this._lineLength = Math.trunc(
      Math.trunc(lineLength) /
        ForkPdfLayoutTextStripper.OUTPUT_SPACE_CHARACTER_WIDTH_IN_PT,
    );
    this._line = new Array(this._lineLength).fill(TextLine.SPACE_CHARACTER);
  }

  writeCharacterAtIndex(character: Character): void {
    character.index = this._computeIndexForCharacter(character);

    const index = character.index;
    const characterValue = character.characterValue;

    if (
      this._indexIsInBounds(index) &&
      this._line[index] === TextLine.SPACE_CHARACTER
    ) {
      this._line[index] = characterValue;
    }
  }

  get lineLength(): number {
    return this._lineLength;
  }

  get line(): string {
    return this._line.join("");
  }

  private _computeIndexForCharacter(character: Character): number {
    let index = character.index;
    const isCharacterPartOfPreviousWord =
      character.isCharacterPartOfPreviousWord;
    const isCharacterAtTheBeginningOfNewLine =
      character.isCharacterAtTheBeginningOfNewLine;
    const isCharacterCloseToPreviousWord =
      character.isCharacterCloseToPreviousWord;

    if (!this._indexIsInBounds(index)) {
      return -1;
    }

    if (isCharacterPartOfPreviousWord && !isCharacterAtTheBeginningOfNewLine) {
      index = this._findMinimumIndexWithSpaceCharacterFromIndex(index);
    } else if (isCharacterCloseToPreviousWord) {
      if (this._line[index] !== TextLine.SPACE_CHARACTER) {
        index = index + 1;
      } else {
        index = this._findMinimumIndexWithSpaceCharacterFromIndex(index) + 1;
      }
    }

    return this._getNextValidIndex(index, isCharacterPartOfPreviousWord);
  }

  private _isNotSpaceCharacterAtIndex(index: number): boolean {
    return this._line[index] !== TextLine.SPACE_CHARACTER;
  }

  private _isNewIndexGreaterThanLastIndex(index: number): boolean {
    return index > this._lastIndex;
  }

  private _getNextValidIndex(
    index: number,
    isCharacterPartOfPreviousWord: boolean,
  ): number {
    let nextValidIndex = index;

    if (!this._isNewIndexGreaterThanLastIndex(index)) {
      nextValidIndex = this._lastIndex + 1;
    }

    if (
      !isCharacterPartOfPreviousWord &&
      index > 0 &&
      this._isNotSpaceCharacterAtIndex(index - 1)
    ) {
      nextValidIndex = nextValidIndex + 1;
    }

    this._lastIndex = nextValidIndex;
    return nextValidIndex;
  }

  private _findMinimumIndexWithSpaceCharacterFromIndex(index: number): number {
    let newIndex = index;

    while (newIndex >= 0 && this._line[newIndex] === TextLine.SPACE_CHARACTER) {
      newIndex = newIndex - 1;
    }

    return newIndex + 1;
  }

  private _indexIsInBounds(index: number): boolean {
    return index >= 0 && index < this._lineLength;
  }
}
