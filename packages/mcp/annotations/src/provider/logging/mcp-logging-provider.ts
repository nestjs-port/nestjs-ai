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

import type { LoggingMessageNotification } from "@modelcontextprotocol/client";

import { MCP_LOGGING_METADATA_KEY } from "../../metadata.js";
import {
  LoggingSpecification,
  McpLoggingMethodCallback,
} from "../../method/index.js";
import type { McpLoggingMetadata } from "../../mcp-logging.js";
import {
  discoverAnnotatedMethodKeys,
  getAnnotatedMethodMetadata,
} from "../annotation-provider-utils.js";

export class McpLoggingProvider {
  private readonly _loggingObjects: readonly object[];

  constructor(loggingObjects: object[]) {
    assert(loggingObjects != null, "loggingObjects can't be null!");
    this._loggingObjects = [...loggingObjects];
  }

  getLoggingSpecifications(): LoggingSpecification[] {
    return this._loggingObjects.flatMap((loggingObject) =>
      discoverAnnotatedMethodKeys(loggingObject, MCP_LOGGING_METADATA_KEY).map(
        (propertyKey) => {
          const metadata = getAnnotatedMethodMetadata<McpLoggingMetadata>(
            loggingObject,
            propertyKey,
            MCP_LOGGING_METADATA_KEY,
          );
          if (metadata == null) {
            throw new Error(
              `@McpLogging metadata missing on ${String(propertyKey)}`,
            );
          }

          const callback = new McpLoggingMethodCallback({
            provider: loggingObject,
            propertyKey,
          });

          return new LoggingSpecification({
            clients: [...metadata.clients],
            loggingHandler: (
              notification: LoggingMessageNotification,
            ): Promise<void> => callback.apply(notification),
          });
        },
      ),
    );
  }
}
