import assert from "node:assert/strict";
import type { ToolCallback } from "./tool-callback";
import type { ToolCallbackProvider } from "./tool-callback-provider";

export class StaticToolCallbackProvider implements ToolCallbackProvider {
  private readonly _toolCallbacks: ToolCallback[];

  constructor(toolCallbacks: ToolCallback[]);
  constructor(...toolCallbacks: ToolCallback[]);
  constructor(...toolCallbacks: ToolCallback[] | [ToolCallback[]]) {
    assert(toolCallbacks, "ToolCallbacks must not be null");
    if (toolCallbacks.length === 1 && Array.isArray(toolCallbacks[0])) {
      assert(
        (toolCallbacks[0] as ToolCallback[]).every(
          (toolCallback) => toolCallback != null,
        ),
        "toolCallbacks cannot contain null elements",
      );
      this._toolCallbacks = toolCallbacks[0] as ToolCallback[];
      return;
    }
    this._toolCallbacks = toolCallbacks as ToolCallback[];
  }

  get toolCallbacks(): ToolCallback[] {
    return this._toolCallbacks;
  }
}
