/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { LoggerFactory } from "@nestjs-ai/commons";
import { ForkPdfLayoutTextStripper } from "./fork-pdf-layout-text-stripper";

export class Character {
  private static readonly logger = LoggerFactory.getLogger(Character.name);

  private readonly _characterValue: string;
  private _index: number;
  private readonly _isCharacterPartOfPreviousWord: boolean;
  private readonly _isFirstCharacterOfAWord: boolean;
  private readonly _isCharacterAtTheBeginningOfNewLine: boolean;
  private readonly _isCharacterCloseToPreviousWord: boolean;

  constructor(
    characterValue: string,
    index: number,
    isCharacterPartOfPreviousWord: boolean,
    isFirstCharacterOfAWord: boolean,
    isCharacterAtTheBeginningOfNewLine: boolean,
    isCharacterPartOfASentence: boolean,
  ) {
    this._characterValue = characterValue;
    this._index = index;
    this._isCharacterPartOfPreviousWord = isCharacterPartOfPreviousWord;
    this._isFirstCharacterOfAWord = isFirstCharacterOfAWord;
    this._isCharacterAtTheBeginningOfNewLine =
      isCharacterAtTheBeginningOfNewLine;
    this._isCharacterCloseToPreviousWord = isCharacterPartOfASentence;

    if (ForkPdfLayoutTextStripper.DEBUG) {
      Character.logger.info(this.toString());
    }
  }

  get characterValue(): string {
    return this._characterValue;
  }

  get index(): number {
    return this._index;
  }

  set index(index: number) {
    this._index = index;
  }

  get isCharacterPartOfPreviousWord(): boolean {
    return this._isCharacterPartOfPreviousWord;
  }

  get isFirstCharacterOfAWord(): boolean {
    return this._isFirstCharacterOfAWord;
  }

  get isCharacterAtTheBeginningOfNewLine(): boolean {
    return this._isCharacterAtTheBeginningOfNewLine;
  }

  get isCharacterCloseToPreviousWord(): boolean {
    return this._isCharacterCloseToPreviousWord;
  }

  toString(): string {
    return `${this._index} ${this._characterValue} isCharacterPartOfPreviousWord=${this._isCharacterPartOfPreviousWord} isFirstCharacterOfAWord=${this._isFirstCharacterOfAWord} isCharacterAtTheBeginningOfNewLine=${this._isCharacterAtTheBeginningOfNewLine} isCharacterPartOfASentence=${this._isCharacterCloseToPreviousWord} isCharacterCloseToPreviousWord=${this._isCharacterCloseToPreviousWord}`;
  }
}
