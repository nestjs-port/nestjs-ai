import { Readable } from "node:stream";
import type { ToolCallResultConverter } from "./tool-call-result-converter";

/**
 * A default implementation of {@link ToolCallResultConverter}.
 */
export class DefaultToolCallResultConverter implements ToolCallResultConverter {
  async convert(
    result?: unknown | null,
    _returnType?: unknown | null,
  ): Promise<string> {
    // Note: In Node.js, it's difficult to properly determine returnType at runtime,
    // so we only use result for conversion instead of returnType.
    if (result == null) {
      return JSON.stringify("Done");
    }

    if (result instanceof Map) {
      return JSON.stringify(Object.fromEntries(result));
    }

    if (result instanceof Set) {
      return JSON.stringify(Array.from(result));
    }

    // Note: In Node.js, it's difficult to determine if result is an image,
    // so we just check if it's a Buffer or Readable.
    if (Buffer.isBuffer(result)) {
      return JSON.stringify({
        mimeType: "image/png",
        data: result.toString("base64"),
      });
    }

    if (result instanceof Readable) {
      const data = await this.readStreamAsBase64(result);
      return JSON.stringify({
        mimeType: "image/png",
        data,
      });
    }

    return JSON.stringify(result);
  }

  private async readStreamAsBase64(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("base64");
  }
}
