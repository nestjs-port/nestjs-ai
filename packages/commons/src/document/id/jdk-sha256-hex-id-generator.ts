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

import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import type { IdGenerator } from "./id-generator.interface";

export class JdkSha256HexIdGenerator implements IdGenerator {
  private static readonly SHA_256 = "sha256";
  private static readonly BYTE_HEX_FORMAT_SIZE = 2;

  private readonly _algorithm: string;
  private readonly _charset: BufferEncoding;

  constructor(
    algorithm = JdkSha256HexIdGenerator.SHA_256,
    charset: BufferEncoding = "utf8",
  ) {
    this._algorithm = algorithm;
    this._charset = charset;
  }

  generateId(...contents: unknown[]): string {
    return this.hash(this.serializeToBytes(...contents));
  }

  private hash(contentWithMetadata: Uint8Array): string {
    const hashBytes = this.getMessageDigest(contentWithMetadata);
    const hex = Array.from(hashBytes, (b) =>
      b
        .toString(16)
        .padStart(JdkSha256HexIdGenerator.BYTE_HEX_FORMAT_SIZE, "0"),
    ).join("");
    return JdkSha256HexIdGenerator.nameUUIDFromBytes(
      Buffer.from(hex, this._charset),
    );
  }

  private serializeToBytes(...contents: unknown[]): Uint8Array {
    assert(contents != null, "Contents must not be null");
    try {
      const normalized = contents.map((content) =>
        JdkSha256HexIdGenerator.normalizeContent(content),
      );
      return Buffer.from(JSON.stringify(normalized), this._charset);
    } catch (error) {
      throw new Error("Failed to serialize", { cause: error });
    }
  }

  private getMessageDigest(input: Uint8Array): Buffer {
    try {
      return createHash(this._algorithm).update(input).digest();
    } catch (error) {
      throw new Error("Unsupported digest algorithm", { cause: error });
    }
  }

  private static nameUUIDFromBytes(input: Uint8Array): string {
    const md5 = createHash("md5").update(input).digest();
    md5[6] = (md5[6] & 0x0f) | 0x30;
    md5[8] = (md5[8] & 0x3f) | 0x80;

    const hex = md5.toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  private static normalizeContent(content: unknown): unknown {
    if (
      content == null ||
      typeof content === "string" ||
      typeof content === "number" ||
      typeof content === "boolean"
    ) {
      return content;
    }

    if (Array.isArray(content)) {
      return content.map((item) =>
        JdkSha256HexIdGenerator.normalizeContent(item),
      );
    }

    if (content instanceof Set) {
      return [...content]
        .map((item) => JdkSha256HexIdGenerator.normalizeContent(item))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }

    if (content instanceof Map) {
      return [...content.entries()]
        .map(([key, value]) => [
          key,
          JdkSha256HexIdGenerator.normalizeContent(value),
        ])
        .sort(([a], [b]) => String(a).localeCompare(String(b)));
    }

    if (typeof content === "object") {
      return Object.entries(content as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .reduce<Record<string, unknown>>((acc, [key, value]) => {
          acc[key] = JdkSha256HexIdGenerator.normalizeContent(value);
          return acc;
        }, {});
    }

    return String(content);
  }
}
