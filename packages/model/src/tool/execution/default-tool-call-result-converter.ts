/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Readable } from "node:stream";
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import type { ToolCallResultConverter } from "./tool-call-result-converter.js";

type StandardSchemaWithJsonSchema = StandardSchemaV1 & StandardJSONSchemaV1;

/**
 * A default implementation of {@link ToolCallResultConverter}.
 */
export class DefaultToolCallResultConverter implements ToolCallResultConverter {
  async convert(
    result?: unknown | null,
    returnType?: StandardSchemaWithJsonSchema | null,
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
    returnType?: StandardSchemaWithJsonSchema | null,
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
