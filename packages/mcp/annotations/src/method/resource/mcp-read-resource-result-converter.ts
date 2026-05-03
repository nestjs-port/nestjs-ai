/*
 * Copyright 2026-present the original author or authors.
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

import type { ReadResourceResult } from "@modelcontextprotocol/server";
import type { ResourceContentType } from "./resource-content-type.js";

/**
 * Interface for converting method return values to `ReadResourceResult`.
 *
 * This interface defines a contract for converting various return types from resource
 * methods to a standardized `ReadResourceResult` format.
 */
export abstract class McpReadResourceResultConverter {
  /**
   * Converts the method's return value to a `ReadResourceResult`, propagating
   * resource-level metadata to the content items when provided.
   * @param result The method's return value
   * @param requestUri The original request URI
   * @param mimeType The MIME type of the resource
   * @param contentType The content type of the resource
   * @param meta The resource-level metadata to propagate to content items
   * @returns A `ReadResourceResult` containing the appropriate resource contents
   * @throws Error if the return type is not supported
   */
  abstract convertToReadResourceResult(
    result: unknown,
    requestUri: string,
    mimeType: string | null,
    contentType: ResourceContentType | null,
    meta?: Record<string, unknown> | null,
  ): ReadResourceResult;
}
