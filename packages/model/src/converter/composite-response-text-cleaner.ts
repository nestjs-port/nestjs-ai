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

import assert from "node:assert/strict";
import type { ResponseTextCleaner } from "./response-text-cleaner";

export class CompositeResponseTextCleaner implements ResponseTextCleaner {
  private readonly _cleaners: ResponseTextCleaner[];

  constructor(cleaners: ResponseTextCleaner[] = []) {
    assert(cleaners, "cleaners cannot be null");
    this._cleaners = [...cleaners];
  }

  clean(text: string | null): string | null {
    let result = text;
    for (const cleaner of this._cleaners) {
      result = cleaner.clean(result);
    }
    return result;
  }

  static builder(): CompositeResponseTextCleanerBuilder {
    return new CompositeResponseTextCleanerBuilder();
  }
}

export class CompositeResponseTextCleanerBuilder {
  private readonly _cleaners: ResponseTextCleaner[] = [];

  addCleaner(cleaner: ResponseTextCleaner): this {
    assert(cleaner, "cleaner cannot be null");
    this._cleaners.push(cleaner);
    return this;
  }

  build(): CompositeResponseTextCleaner {
    return new CompositeResponseTextCleaner(this._cleaners);
  }
}
