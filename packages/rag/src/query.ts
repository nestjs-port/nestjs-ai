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
import { StringUtils } from "@nestjs-ai/commons";
import type { Message } from "@nestjs-ai/model";

export class Query {
  readonly text: string;
  readonly history: Message[];
  readonly context: Record<string, unknown>;

  constructor(
    text: string,
    history: Message[] = [],
    context: Record<string, unknown> = {},
  ) {
    assert(StringUtils.hasText(text), "text cannot be null or empty");
    assert(history != null, "history cannot be null");
    for (const message of history) {
      assert(message != null, "history elements cannot be null");
    }
    assert(context != null, "context cannot be null");
    for (const key of Object.keys(context)) {
      assert(key != null, "context keys cannot be null");
    }

    this.text = text;
    this.history = history;
    this.context = context;
  }

  mutate(): QueryBuilder {
    return new QueryBuilder()
      .text(this.text)
      .history(this.history)
      .context(this.context);
  }

  static builder(): QueryBuilder {
    return new QueryBuilder();
  }
}

export class QueryBuilder {
  private _text: string | null = null;
  private _history: Message[] = [];
  private _context: Record<string, unknown> = {};

  text(text: string): this {
    this._text = text;
    return this;
  }

  history(history: Message[]): this;
  history(...history: Message[]): this;
  history(historyOrFirst: Message[] | Message, ...rest: Message[]): this {
    if (Array.isArray(historyOrFirst)) {
      this._history = [...historyOrFirst];
      return this;
    }

    this._history = [historyOrFirst, ...rest];
    return this;
  }

  context(context: Record<string, unknown>): this {
    this._context = { ...context };
    return this;
  }

  build(): Query {
    assert(
      typeof this._text === "string" && this._text.trim().length > 0,
      "text cannot be null or empty",
    );
    return new Query(this._text, this._history, this._context);
  }
}
