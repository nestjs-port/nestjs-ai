import type { ToolCallback } from "../tool/tool-callback.js";
import type { ToolObjectInstance } from "../tool/method/method-tool-callback-provider.js";
import { MethodToolCallbackProvider } from "../tool/method/method-tool-callback-provider.js";

export abstract class ToolCallbacks {
  static from(source: ToolObjectInstance): ToolCallback[];
  static from(sources: ToolObjectInstance[]): ToolCallback[];
  static from(
    sources: ToolObjectInstance[] | ToolObjectInstance,
  ): ToolCallback[] {
    if (Array.isArray(sources)) {
      return new MethodToolCallbackProvider(sources).toolCallbacks;
    }

    return new MethodToolCallbackProvider([sources]).toolCallbacks;
  }
}
