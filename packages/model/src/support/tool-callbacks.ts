import type { ToolCallback, ToolObjectInstance } from "../tool";
import { MethodToolCallbackProvider } from "../tool";

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
