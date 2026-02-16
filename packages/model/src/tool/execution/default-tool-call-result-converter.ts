import type { ToolCallResultConverter } from "./tool-call-result-converter";

/**
 * A default implementation of {@link ToolCallResultConverter}.
 */
export class DefaultToolCallResultConverter implements ToolCallResultConverter {
  convert(result?: unknown | null, _returnType?: unknown | null): string {
    // Note: In Node.js, it's difficult to properly determine returnType at runtime,
    // so we only use result for conversion instead of returnType.
    // if (returnType === undefined || returnType === null) {
    // 	return JSON.stringify("Done");
    // }

    if (result === undefined || result === null) {
      return "null";
    }

    if (result instanceof Map) {
      return JSON.stringify(Object.fromEntries(result));
    }

    if (result instanceof Set) {
      return JSON.stringify(Array.from(result));
    }

    // TODO: handle image result

    return JSON.stringify(result);
  }
}
