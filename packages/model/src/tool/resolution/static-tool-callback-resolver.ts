import assert from "node:assert/strict";
import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import type { ToolCallback } from "../tool-callback";
import type { ToolCallbackResolver } from "./tool-callback-resolver.interface";

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
