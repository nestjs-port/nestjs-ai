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

import { assert, describe, expect, it } from "vitest";
import type { Resource } from "@modelcontextprotocol/server";
import { MCP_RESOURCE_LIST_CHANGED_METADATA_KEY } from "../metadata.js";
import { McpResourceListChanged } from "../mcp-resource-list-changed.js";
import type { McpResourceListChangedMetadata } from "../mcp-resource-list-changed.js";

class McpResourceListChangedTypeExamples {
  @McpResourceListChanged({ clients: ["test-client"] })
  validSync(updatedResources: Resource[]): void {
    void updatedResources.length;
  }

  @McpResourceListChanged({ clients: ["test-client"] })
  async validAsync(updatedResources: Resource[]): Promise<void> {
    void updatedResources.length;
  }

  // @ts-expect-error @McpResourceListChanged only supports methods with exactly one Resource[] parameter
  @McpResourceListChanged({ clients: ["test-client"] })
  noArguments() {}

  // @ts-expect-error @McpResourceListChanged only supports methods with a Resource[] parameter
  @McpResourceListChanged({ clients: ["test-client"] })
  wrongArgumentType(_value: string) {}

  // @ts-expect-error @McpResourceListChanged only supports methods returning void or Promise<void>
  @McpResourceListChanged({ clients: ["test-client"] })
  wrongReturnType(updatedResources: Resource[]) {
    return updatedResources.length;
  }

  // @ts-expect-error @McpResourceListChanged only supports methods with exactly one Resource[] parameter
  @McpResourceListChanged({ clients: ["test-client"] })
  tooManyArguments(updatedResources: Resource[], _context: string) {
    void updatedResources.length;
    void _context;
  }
}

void McpResourceListChangedTypeExamples;

describe("McpResourceListChanged", () => {
  class TestHandlers {
    @McpResourceListChanged({ clients: ["test-client"] })
    onResourceListChanged(updatedResources: Resource[]): void {
      void updatedResources.length;
    }
  }

  it("stores metadata for resource list changed handlers", () => {
    const metadata = Reflect.getMetadata(
      MCP_RESOURCE_LIST_CHANGED_METADATA_KEY,
      TestHandlers.prototype,
      "onResourceListChanged",
    ) as McpResourceListChangedMetadata;

    assert.exists(metadata);
    expect(metadata.clients).toEqual(["test-client"]);
  });
});
