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
import type { ChatResponse } from "@nestjs-ai/model";

export class ChatClientResponse {
  private readonly _chatResponse: ChatResponse | null;
  private readonly _context: Map<string, unknown>;

  constructor(
    chatResponse: ChatResponse | null,
    context: Map<string, unknown> = new Map(),
  ) {
    assert(context, "context cannot be null");

    for (const key of context.keys()) {
      assert(key != null, "context keys cannot be null");
    }

    this._chatResponse = chatResponse;
    this._context = new Map(context);
  }

  get chatResponse(): ChatResponse | null {
    return this._chatResponse;
  }

  get context(): Map<string, unknown> {
    return new Map(this._context);
  }

  copy(): ChatClientResponse {
    return new ChatClientResponse(this._chatResponse, new Map(this._context));
  }

  mutate(): ChatClientResponseBuilder {
    return new ChatClientResponseBuilder()
      .chatResponse(this._chatResponse)
      .context(new Map(this._context));
  }

  static builder(): ChatClientResponseBuilder {
    return new ChatClientResponseBuilder();
  }
}

export class ChatClientResponseBuilder {
  private _chatResponse: ChatResponse | null = null;
  private readonly _context = new Map<string, unknown>();

  chatResponse(chatResponse: ChatResponse | null): this {
    this._chatResponse = chatResponse;
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

  build(): ChatClientResponse {
    return new ChatClientResponse(this._chatResponse, new Map(this._context));
  }
}
