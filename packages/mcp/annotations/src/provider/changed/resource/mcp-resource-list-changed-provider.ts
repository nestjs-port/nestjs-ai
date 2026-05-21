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

import type { Resource } from "@modelcontextprotocol/server";

import { MCP_RESOURCE_LIST_CHANGED_METADATA_KEY } from "../../../metadata.js";
import { McpResourceListChangedMethodCallback } from "../../../method/changed/resource/mcp-resource-list-changed-method-callback.js";
import { ResourceListChangedSpecification } from "../../../method/changed/resource/resource-list-changed-specification.js";
import type { McpResourceListChangedMetadata } from "../../../mcp-resource-list-changed.js";
import {
  discoverAnnotatedMethodKeys,
  getAnnotatedMethodMetadata,
} from "../../annotation-provider-utils.js";

export class McpResourceListChangedProvider {
  private readonly _resourceListChangedObjects: readonly object[];

  constructor(resourceListChangedObjects: object[]) {
    assert(
      resourceListChangedObjects != null,
      "resourceListChangedObjects can't be null!",
    );
    this._resourceListChangedObjects = [...resourceListChangedObjects];
  }

  getResourceListChangedSpecifications(): ResourceListChangedSpecification[] {
    return this._resourceListChangedObjects.flatMap(
      (resourceListChangedObject) =>
        discoverAnnotatedMethodKeys(
          resourceListChangedObject,
          MCP_RESOURCE_LIST_CHANGED_METADATA_KEY,
        ).map((propertyKey) => {
          const metadata =
            getAnnotatedMethodMetadata<McpResourceListChangedMetadata>(
              resourceListChangedObject,
              propertyKey,
              MCP_RESOURCE_LIST_CHANGED_METADATA_KEY,
            );
          if (metadata == null) {
            throw new Error(
              `@McpResourceListChanged metadata missing on ${String(propertyKey)}`,
            );
          }

          const callback = new McpResourceListChangedMethodCallback({
            provider: resourceListChangedObject,
            propertyKey,
          });

          return new ResourceListChangedSpecification({
            clients: [...metadata.clients],
            resourceListChangeHandler: async (
              error: Error | null,
              updatedResources: Resource[] | null,
            ): Promise<void> => {
              if (error != null) {
                throw error;
              }
              if (updatedResources == null) {
                throw new TypeError("Updated resources list must not be null");
              }

              await callback.apply(updatedResources);
            },
          });
        }),
    );
  }
}
