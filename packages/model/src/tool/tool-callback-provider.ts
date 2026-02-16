import assert from "node:assert/strict";
import type { ToolCallback } from "./tool-callback";

export abstract class ToolCallbackProvider {
  abstract get toolCallbacks(): ToolCallback[];

  static from(toolCallbacks: ToolCallback[]): ToolCallbackProvider;

  static from(...toolCallbacks: ToolCallback[]): ToolCallbackProvider;

  static from(
    ...toolCallbacks: ToolCallback[] | [ToolCallback[]]
  ): ToolCallbackProvider {
    if (toolCallbacks.length === 1 && Array.isArray(toolCallbacks[0])) {
      return new StaticToolCallbackProvider(toolCallbacks[0] as ToolCallback[]);
    }
    return new StaticToolCallbackProvider(toolCallbacks as ToolCallback[]);
  }
}

export class StaticToolCallbackProvider extends ToolCallbackProvider {
  private readonly _toolCallbacks: ToolCallback[];

  constructor(toolCallbacks: ToolCallback[]);
  constructor(...toolCallbacks: ToolCallback[]);
  constructor(...toolCallbacks: ToolCallback[] | [ToolCallback[]]) {
    super();
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

  override get toolCallbacks(): ToolCallback[] {
    return this._toolCallbacks;
  }
}
