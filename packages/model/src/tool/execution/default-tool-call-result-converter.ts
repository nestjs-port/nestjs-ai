import { Readable } from "node:stream";
import type { z } from "zod";
import type { ToolCallResultConverter } from "./tool-call-result-converter";

/**
 * A default implementation of {@link ToolCallResultConverter}.
 */
export class DefaultToolCallResultConverter implements ToolCallResultConverter {
  async convert(
    result?: unknown | null,
    returnType?: z.ZodTypeAny | null,
  ): Promise<string> {
    if (this.isConventionalDoneReturnType(returnType)) {
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

    const json = JSON.stringify(result);
    return json === undefined ? "null" : json;
  }

  private isConventionalDoneReturnType(
    returnType?: z.ZodTypeAny | null,
  ): boolean {
    if (!returnType) {
      return false;
    }

    const schemaType = (returnType as { _zod?: { def?: { type?: unknown } } })
      ._zod?.def?.type;

    return schemaType === "void" || schemaType === "undefined";
  }

  private async readStreamAsBase64(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("base64");
  }
}
