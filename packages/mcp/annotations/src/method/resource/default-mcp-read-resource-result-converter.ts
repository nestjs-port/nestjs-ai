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

import type {
  BlobResourceContents,
  ReadResourceResult,
  TextResourceContents,
} from "@modelcontextprotocol/server";
import { McpReadResourceResultConverter } from "./mcp-read-resource-result-converter.js";
import { ResourceContentType } from "./resource-content-type.js";

type ReadResourceContent = TextResourceContents | BlobResourceContents;

/**
 * Default MIME type to use when none is specified.
 */
const DEFAULT_MIME_TYPE = "text/plain";

/**
 * Default implementation of `McpReadResourceResultConverter`.
 *
 * This class provides a standard implementation for converting various return types from
 * resource methods to a standardized `ReadResourceResult` format.
 */
export class DefaultMcpReadResourceResultConverter extends McpReadResourceResultConverter {
  /**
   * Converts the method's return value to a `ReadResourceResult`, propagating
   * resource-level metadata to the content items.
   * @param result The method's return value
   * @param requestUri The original request URI
   * @param mimeType The MIME type of the resource
   * @param contentType The content type of the resource
   * @param meta The resource-level metadata to propagate to content items
   * @returns A `ReadResourceResult` containing the appropriate resource contents
   * @throws Error if the return type is not supported
   */
  override convertToReadResourceResult(
    result: unknown,
    requestUri: string,
    mimeType: string | null,
    contentType: ResourceContentType | null,
    meta?: Record<string, unknown> | null,
  ): ReadResourceResult {
    if (result == null) {
      return { contents: [] };
    }

    if (this.isReadResourceResult(result)) {
      return result;
    }

    const resolvedMimeType =
      mimeType != null && mimeType.length > 0 ? mimeType : DEFAULT_MIME_TYPE;

    // Determine content type from mime type since contentType() was moved from
    // McpResource
    const resolvedContentType =
      contentType != null
        ? contentType
        : this.isTextMimeType(resolvedMimeType)
          ? ResourceContentType.TEXT
          : ResourceContentType.BLOB;

    let contents: ReadResourceContent[];

    if (Array.isArray(result)) {
      contents = this.convertListResult(
        result,
        requestUri,
        resolvedContentType,
        resolvedMimeType,
        meta ?? null,
      );
    } else if (this.isResourceContents(result)) {
      // Single ResourceContents
      contents = [result];
    } else if (typeof result === "string") {
      // Single String -> ResourceContents (TextResourceContents or
      // BlobResourceContents)
      contents = this.convertStringResult(
        result,
        requestUri,
        resolvedContentType,
        resolvedMimeType,
        meta ?? null,
      );
    } else {
      throw new Error(`Unsupported return type: ${this.getTypeName(result)}`);
    }

    return { contents };
  }

  private isTextMimeType(mimeType: string | null): boolean {
    if (mimeType == null) {
      return false;
    }

    // Direct text types
    if (mimeType.startsWith("text/")) {
      return true;
    }

    // Common text-based MIME types that don't start with "text/"
    return (
      mimeType === "application/json" ||
      mimeType === "application/xml" ||
      mimeType === "application/javascript" ||
      mimeType === "application/ecmascript" ||
      mimeType === "application/x-httpd-php" ||
      mimeType === "application/xhtml+xml" ||
      mimeType.endsWith("+json") ||
      mimeType.endsWith("+xml")
    );
  }

  /**
   * Converts a List result to a list of ResourceContents with metadata.
   * @param list The list result
   * @param requestUri The original request URI
   * @param contentType The content type (TEXT or BLOB)
   * @param mimeType The MIME type
   * @param meta The resource-level metadata to propagate to content items
   * @returns A list of ResourceContents
   * @throws Error if the list item type is not supported
   */
  private convertListResult(
    list: unknown[],
    requestUri: string,
    contentType: ResourceContentType,
    mimeType: string,
    meta: Record<string, unknown> | null,
  ): ReadResourceContent[] {
    if (list.length === 0) {
      return [];
    }

    const firstItem = list[0];

    if (this.isResourceContents(firstItem)) {
      // List<ResourceContents>
      return list as ReadResourceContent[];
    }

    if (typeof firstItem === "string") {
      // List<String> -> List<ResourceContents> (TextResourceContents or
      // BlobResourceContents)
      const stringList = list as string[];
      const result: ReadResourceContent[] = [];

      if (contentType === ResourceContentType.TEXT) {
        for (const text of stringList) {
          const item: TextResourceContents = {
            uri: requestUri,
            mimeType,
            text,
            _meta: meta ?? undefined,
          };
          result.push(item);
        }
      } else {
        for (const blob of stringList) {
          const item: BlobResourceContents = {
            uri: requestUri,
            mimeType,
            blob,
            _meta: meta ?? undefined,
          };
          result.push(item);
        }
      }

      return result;
    }

    throw new Error(
      `Unsupported list item type: ${this.getTypeName(firstItem)}. Expected String or ResourceContents.`,
    );
  }

  /**
   * Converts a String result to a list of ResourceContents with metadata.
   * @param stringResult The string result
   * @param requestUri The original request URI
   * @param contentType The content type (TEXT or BLOB)
   * @param mimeType The MIME type
   * @param meta The resource-level metadata to propagate to content items
   * @returns A list containing a single ResourceContents
   */
  private convertStringResult(
    stringResult: string,
    requestUri: string,
    contentType: ResourceContentType,
    mimeType: string,
    meta: Record<string, unknown> | null,
  ): ReadResourceContent[] {
    if (contentType === ResourceContentType.TEXT) {
      const item: TextResourceContents = {
        uri: requestUri,
        mimeType,
        text: stringResult,
        _meta: meta ?? undefined,
      };
      return [item];
    }
    const item: BlobResourceContents = {
      uri: requestUri,
      mimeType,
      blob: stringResult,
      _meta: meta ?? undefined,
    };
    return [item];
  }

  private isReadResourceResult(value: unknown): value is ReadResourceResult {
    return (
      typeof value === "object" &&
      value !== null &&
      "contents" in value &&
      Array.isArray((value as { contents: unknown }).contents)
    );
  }

  private isResourceContents(value: unknown): value is ReadResourceContent {
    return (
      typeof value === "object" &&
      value !== null &&
      "uri" in value &&
      typeof (value as { uri: unknown }).uri === "string"
    );
  }

  private getTypeName(value: unknown): string {
    if (value == null) {
      return "unknown";
    }
    if (typeof value === "object" && value.constructor?.name) {
      return value.constructor.name;
    }
    return typeof value;
  }
}
