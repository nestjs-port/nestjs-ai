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
import type { Prompt } from "@nestjs-ai/model";

export class ChatClientRequest {
  private readonly _prompt: Prompt;
  private readonly _context: Map<string, unknown>;

  constructor(prompt: Prompt, context: Map<string, unknown> = new Map()) {
    assert(prompt, "prompt cannot be null");
    assert(context, "context cannot be null");

    for (const key of context.keys()) {
      assert(key != null, "context keys cannot be null");
    }

    this._prompt = prompt;
    this._context = new Map(context);
  }

  get prompt(): Prompt {
    return this._prompt;
  }

  get context(): Map<string, unknown> {
    return new Map(this._context);
  }

  copy(): ChatClientRequest {
    return new ChatClientRequest(this._prompt.copy(), new Map(this._context));
  }

  mutate(): ChatClientRequestBuilder {
    return new ChatClientRequestBuilder()
      .prompt(this._prompt.copy())
      .context(new Map(this._context));
  }

  static builder(): ChatClientRequestBuilder {
    return new ChatClientRequestBuilder();
  }
}

export class ChatClientRequestBuilder {
  private _prompt: Prompt | null = null;
  private readonly _context = new Map<string, unknown>();

  prompt(prompt: Prompt): this {
    assert(prompt, "prompt cannot be null");
    this._prompt = prompt;
    return this;
  }

  context(context: Map<string, unknown>): this;
  context(key: string, value: unknown): this;
  context(contextOrKey: Map<string, unknown> | string, value?: unknown): this {
    if (typeof contextOrKey === "string") {
      assert(contextOrKey, "key cannot be null");
      this._context.set(contextOrKey, value ?? null);
      return this;
    }

    assert(contextOrKey, "context cannot be null");
    for (const [key, contextValue] of contextOrKey.entries()) {
      this._context.set(key, contextValue);
    }
    return this;
  }

  build(): ChatClientRequest {
    assert(this._prompt != null, "prompt cannot be null");
    return new ChatClientRequest(this._prompt, new Map(this._context));
  }
}
