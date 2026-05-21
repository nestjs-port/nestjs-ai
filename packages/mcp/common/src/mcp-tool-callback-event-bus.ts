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

import { EventEmitter } from "node:events";

export const MCP_TOOL_CALLBACKS_LIST_CHANGED_EVENT = "mcp.tools.list-changed";

export type McpToolCallbacksListChangedListener = (clientName: string) => void;

export class McpToolCallbackEventBus extends EventEmitter {
  private readonly _toolsChangedListeners = new Map<
    McpToolCallbacksListChangedListener,
    true
  >();

  onToolsListChanged(listener: McpToolCallbacksListChangedListener): void {
    if (this._toolsChangedListeners.has(listener)) {
      return;
    }

    this._toolsChangedListeners.set(listener, true);
    this.on(MCP_TOOL_CALLBACKS_LIST_CHANGED_EVENT, listener);
  }

  emitToolsListChanged(clientName: string): boolean {
    return this.emit(MCP_TOOL_CALLBACKS_LIST_CHANGED_EVENT, clientName);
  }
}
