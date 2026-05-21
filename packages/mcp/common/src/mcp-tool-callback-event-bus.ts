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
