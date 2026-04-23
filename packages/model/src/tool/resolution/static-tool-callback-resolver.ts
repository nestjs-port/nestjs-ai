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
import { type Logger, LoggerFactory } from "@nestjs-port/core";
import type { ToolCallback } from "../tool-callback.js";
import type { ToolCallbackResolver } from "./tool-callback-resolver.interface.js";

export class StaticToolCallbackResolver implements ToolCallbackResolver {
  private readonly _logger: Logger = LoggerFactory.getLogger(
    StaticToolCallbackResolver.name,
  );
  private readonly _toolCallbacks: Map<string, ToolCallback> = new Map();

  constructor(toolCallbacks: ToolCallback[]) {
    assert(toolCallbacks != null, "toolCallbacks cannot be null");
    assert(
      toolCallbacks.every((toolCallback) => toolCallback != null),
      "toolCallbacks cannot contain null elements",
    );

    toolCallbacks.forEach((toolCallback) => {
      this._toolCallbacks.set(toolCallback.toolDefinition.name, toolCallback);
    });
  }

  resolve(toolName: string): ToolCallback | null {
    assert(toolName?.trim(), "toolName cannot be null or empty");
    this._logger.debug("ToolCallback resolution attempt from static registry");
    return this._toolCallbacks.get(toolName) ?? null;
  }
}
