import type { ToolCallback, ToolObjectInstance } from "../tool";
import { MethodToolCallbackProvider } from "../tool";

export class ToolCallbacks {
  private constructor() {
    throw new Error("This is a utility class and cannot be instantiated");
  }

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
