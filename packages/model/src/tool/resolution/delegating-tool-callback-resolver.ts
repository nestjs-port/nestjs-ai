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
import type { ToolCallback } from "../tool-callback";
import type { ToolCallbackResolver } from "./tool-callback-resolver.interface";

export class DelegatingToolCallbackResolver implements ToolCallbackResolver {
  private readonly _toolCallbackResolvers: ToolCallbackResolver[];

  constructor(toolCallbackResolvers: ToolCallbackResolver[]) {
    assert(
      toolCallbackResolvers != null,
      "toolCallbackResolvers cannot be null",
    );
    assert(
      toolCallbackResolvers.every((r) => r != null),
      "toolCallbackResolvers cannot contain null elements",
    );
    this._toolCallbackResolvers = toolCallbackResolvers;
  }

  resolve(toolName: string): ToolCallback | null {
    assert(toolName?.trim(), "toolName cannot be null or empty");

    for (const resolver of this._toolCallbackResolvers) {
      const toolCallback = resolver.resolve(toolName);
      if (toolCallback != null) {
        return toolCallback;
      }
    }
    return null;
  }
}
