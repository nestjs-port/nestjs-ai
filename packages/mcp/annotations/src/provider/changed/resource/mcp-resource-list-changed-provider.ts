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
import {
  McpResourceListChangedMethodCallback,
  ResourceListChangedSpecification,
} from "../../../method/index.js";
import type { McpResourceListChangedMetadata } from "../../../mcp-resource-list-changed.js";
import {
  discoverAnnotatedMethodKeys,
  getAnnotatedMethodMetadata,
} from "../../annotation-provider-utils.js";

export interface McpResourceListChangedProviderProps {
  resourceListChangedObjects: object[];
}

export class McpResourceListChangedProvider {
  private readonly _resourceListChangedObjects: readonly object[];

  constructor(props: McpResourceListChangedProviderProps) {
    assert(
      props.resourceListChangedObjects != null,
      "resourceListChangedObjects can't be null!",
    );
    this._resourceListChangedObjects = [...props.resourceListChangedObjects];
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
            resourceListChangeHandler: (
              updatedResources: Resource[],
            ): Promise<void> => callback.apply(updatedResources),
          });
        }),
    );
  }
}
