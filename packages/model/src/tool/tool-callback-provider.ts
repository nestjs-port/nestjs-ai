import { StaticToolCallbackProvider } from "./static-tool-callback-provider";
import type { ToolCallback } from "./tool-callback";

export interface ToolCallbackProvider {
  get toolCallbacks(): ToolCallback[];
}

export namespace ToolCallbackProvider {
  export function from(toolCallbacks: ToolCallback[]): ToolCallbackProvider;

  export function from(...toolCallbacks: ToolCallback[]): ToolCallbackProvider;

  export function from(
    ...toolCallbacks: ToolCallback[] | [ToolCallback[]]
  ): ToolCallbackProvider {
    if (toolCallbacks.length === 1 && Array.isArray(toolCallbacks[0])) {
      return new StaticToolCallbackProvider(toolCallbacks[0] as ToolCallback[]);
    }
    return new StaticToolCallbackProvider(toolCallbacks as ToolCallback[]);
  }
}
