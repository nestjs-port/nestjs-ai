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
import type { ElicitResult } from "@modelcontextprotocol/server";

export type ElicitResultAction = ElicitResult["action"];

export interface StructuredElicitResultProps<T> {
  action?: ElicitResultAction;
  structuredContent?: T | null;
  meta?: Record<string, unknown> | null;
}

/**
 * Represents the result of a structured elicit action.
 *
 * @typeParam T - the type of the structured content
 */
export class StructuredElicitResult<T> {
  readonly action: ElicitResultAction;

  readonly structuredContent: T | null;

  readonly meta: Record<string, unknown>;

  constructor(props: StructuredElicitResultProps<T> = {}) {
    const { action = "accept", structuredContent = null, meta = {} } = props;

    assert(action != null, "Action must not be null");

    this.action = action;
    this.structuredContent = structuredContent;
    this.meta = meta != null ? { ...meta } : {};
  }
}
