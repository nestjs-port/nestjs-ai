import assert from "node:assert/strict";
import { Character } from "./character";
import { ForkPdfLayoutTextStripper } from "./fork-pdf-layout-text-stripper";

export interface TextPositionLike {
  unicode: string;
  x: number;
  y: number;
  width: number;
}

export class CharacterFactory {
  private _previousTextPosition: TextPositionLike | null = null;
  private readonly _firstCharacterOfLineFound: boolean;
  private _isCharacterPartOfPreviousWord = false;
  private _isFirstCharacterOfAWord = false;
  private _isCharacterAtTheBeginningOfNewLine = false;
  private _isCharacterCloseToPreviousWord = false;

  constructor(firstCharacterOfLineFound: boolean) {
    this._firstCharacterOfLineFound = firstCharacterOfLineFound;
  }

  createCharacterFromTextPosition(
    textPosition: TextPositionLike,
    previousTextPosition: TextPositionLike | null,
  ): Character {
    this._previousTextPosition = previousTextPosition;
    this._isCharacterPartOfPreviousWord =
      this._isCharacterPartOfPreviousWordFn(textPosition);
    this._isFirstCharacterOfAWord =
      this._isFirstCharacterOfAWordFn(textPosition);
    this._isCharacterAtTheBeginningOfNewLine =
      this._isCharacterAtTheBeginningOfNewLineFn(textPosition);
    this._isCharacterCloseToPreviousWord =
      this._isCharacterCloseToPreviousWordFn(textPosition);

    const character = this._getCharacterFromTextPosition(textPosition);
    const index =
      Math.trunc(textPosition.x) /
      ForkPdfLayoutTextStripper.OUTPUT_SPACE_CHARACTER_WIDTH_IN_PT;

    return new Character(
      character,
      index,
      this._isCharacterPartOfPreviousWord,
      this._isFirstCharacterOfAWord,
      this._isCharacterAtTheBeginningOfNewLine,
      this._isCharacterCloseToPreviousWord,
    );
  }

  private _isCharacterAtTheBeginningOfNewLineFn(
    textPosition: TextPositionLike,
  ): boolean {
    if (!this._firstCharacterOfLineFound) {
      return true;
    }

    assert(
      this._previousTextPosition != null,
      "Text position should have been set",
    );
    const previousTextYPosition = this._previousTextPosition.y;
    return Math.round(textPosition.y) < Math.round(previousTextYPosition);
  }

  private _isFirstCharacterOfAWordFn(textPosition: TextPositionLike): boolean {
    if (!this._firstCharacterOfLineFound) {
      return true;
    }

    assert(
      this._previousTextPosition != null,
      "Text position should have been set",
    );
    const numberOfSpaces = this._numberOfSpacesBetweenTwoCharacters(
      this._previousTextPosition,
      textPosition,
    );
    return (
      numberOfSpaces > 1 ||
      this._isCharacterAtTheBeginningOfNewLineFn(textPosition)
    );
  }

  private _isCharacterCloseToPreviousWordFn(
    textPosition: TextPositionLike,
  ): boolean {
    if (!this._firstCharacterOfLineFound) {
      return false;
    }

    assert(
      this._previousTextPosition != null,
      "Text position should have been set",
    );
    const numberOfSpaces = this._numberOfSpacesBetweenTwoCharacters(
      this._previousTextPosition,
      textPosition,
    );

    return (
      numberOfSpaces > 1 &&
      numberOfSpaces <=
        ForkPdfLayoutTextStripper.OUTPUT_SPACE_CHARACTER_WIDTH_IN_PT
    );
  }

  private _isCharacterPartOfPreviousWordFn(
    textPosition: TextPositionLike,
  ): boolean {
    if (!this._firstCharacterOfLineFound) {
      return false;
    }

    assert(
      this._previousTextPosition != null,
      "Text position should have been set",
    );
    if (this._previousTextPosition.unicode === " ") {
      return false;
    }

    const numberOfSpaces = this._numberOfSpacesBetweenTwoCharacters(
      this._previousTextPosition,
      textPosition,
    );

    return numberOfSpaces <= 1;
  }

  private _numberOfSpacesBetweenTwoCharacters(
    textPosition1: TextPositionLike,
    textPosition2: TextPositionLike,
  ): number {
    const previousTextXPosition = textPosition1.x;
    const previousTextWidth = textPosition1.width;
    const previousTextEndXPosition = previousTextXPosition + previousTextWidth;
    return Math.abs(Math.round(textPosition2.x - previousTextEndXPosition));
  }

  private _getCharacterFromTextPosition(
    textPosition: TextPositionLike,
  ): string {
    const string = textPosition.unicode;
    return string.length > 0 ? string[0] : "\0";
  }
}
