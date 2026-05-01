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

import type { ElicitResult } from "@modelcontextprotocol/sdk/types.js";
import { strict as assert } from "node:assert";

export type ElicitResultAction = ElicitResult["action"];

/**
 * Represents the result of a structured elicit action.
 *
 * @typeParam T - the type of the structured content
 */
export class StructuredElicitResult<T> {
  readonly action: ElicitResultAction;

  readonly structuredContent: T | null;

  readonly meta: Record<string, unknown>;

  constructor(
    action: ElicitResultAction,
    structuredContent: T | null,
    meta: Record<string, unknown> = {},
  ) {
    this.action = action;
    this.structuredContent = structuredContent;
    this.meta = meta;
  }

  static builder<T>(): StructuredElicitResultBuilder<T> {
    return new StructuredElicitResultBuilder<T>();
  }
}

export class StructuredElicitResultBuilder<T> {
  private _action: ElicitResultAction = "accept";

  private _structuredContent: T | null = null;

  private _meta: Record<string, unknown> = {};

  action(action: ElicitResultAction): this {
    assert(action != null, "Action must not be null");
    this._action = action;
    return this;
  }

  structuredContent<U>(structuredContent: U): StructuredElicitResultBuilder<U> {
    const typedBuilder = this as unknown as StructuredElicitResultBuilder<U>;
    typedBuilder._structuredContent = structuredContent;
    return typedBuilder;
  }

  meta(meta: Record<string, unknown> | null | undefined): this {
    this._meta = meta != null ? { ...meta } : {};
    return this;
  }

  addMeta(key: string, value: unknown): this {
    this._meta[key] = value;
    return this;
  }

  build(): StructuredElicitResult<T> {
    return new StructuredElicitResult<T>(
      this._action,
      this._structuredContent,
      this._meta,
    );
  }
}
