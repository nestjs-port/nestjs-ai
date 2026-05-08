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

import type { ProgressNotification } from "@modelcontextprotocol/server";

import { MCP_PROGRESS_METADATA_KEY } from "../../metadata.js";
import {
  McpProgressMethodCallback,
  ProgressSpecification,
} from "../../method/index.js";
import type { McpProgressMetadata } from "../../mcp-progress.js";
import {
  discoverAnnotatedMethodKeys,
  getAnnotatedMethodMetadata,
} from "../annotation-provider-utils.js";

export interface McpProgressProviderProps {
  progressObjects: object[];
}

export class McpProgressProvider {
  private readonly _progressObjects: readonly object[];

  constructor(props: McpProgressProviderProps) {
    this._progressObjects =
      props.progressObjects != null ? [...props.progressObjects] : [];
  }

  getProgressSpecifications(): ProgressSpecification[] {
    return this._progressObjects.flatMap((progressObject) =>
      discoverAnnotatedMethodKeys(
        progressObject,
        MCP_PROGRESS_METADATA_KEY,
      ).map((propertyKey) => {
        const metadata = getAnnotatedMethodMetadata<McpProgressMetadata>(
          progressObject,
          propertyKey,
          MCP_PROGRESS_METADATA_KEY,
        );
        if (metadata == null) {
          throw new Error(
            `@McpProgress metadata missing on ${String(propertyKey)}`,
          );
        }

        const callback = new McpProgressMethodCallback({
          provider: progressObject,
          propertyKey,
        });

        return new ProgressSpecification({
          clients: [...metadata.clients],
          progressHandler: (
            notification: ProgressNotification,
          ): Promise<void> => callback.apply(notification),
        });
      }),
    );
  }
}
