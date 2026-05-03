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
import type { Tool } from "@modelcontextprotocol/server";
import { MCP_TOOL_LIST_CHANGED_METADATA_KEY } from "../metadata.js";
import { McpToolListChanged } from "../mcp-tool-list-changed.js";
import type { McpToolListChangedMetadata } from "../mcp-tool-list-changed.js";

class McpToolListChangedTypeExamples {
  @McpToolListChanged({ clients: ["test-client"] })
  validSync(updatedTools: Tool[]): void {
    void updatedTools.length;
  }

  @McpToolListChanged({ clients: ["test-client"] })
  async validAsync(updatedTools: Tool[]): Promise<void> {
    void updatedTools.length;
  }

  // @ts-expect-error @McpToolListChanged only supports methods with exactly one Tool[] parameter
  @McpToolListChanged({ clients: ["test-client"] })
  noArguments() {}

  // @ts-expect-error @McpToolListChanged only supports methods with a Tool[] parameter
  @McpToolListChanged({ clients: ["test-client"] })
  wrongArgumentType(_value: string) {}

  // @ts-expect-error @McpToolListChanged only supports methods returning void or Promise<void>
  @McpToolListChanged({ clients: ["test-client"] })
  wrongReturnType(updatedTools: Tool[]) {
    return updatedTools.length;
  }

  // @ts-expect-error @McpToolListChanged only supports methods with exactly one Tool[] parameter
  @McpToolListChanged({ clients: ["test-client"] })
  tooManyArguments(updatedTools: Tool[], _context: string) {
    void updatedTools.length;
    void _context;
  }
}

void McpToolListChangedTypeExamples;

describe("McpToolListChanged", () => {
  class TestHandlers {
    @McpToolListChanged({ clients: ["test-client"] })
    onToolListChanged(updatedTools: Tool[]): void {
      void updatedTools.length;
    }
  }

  it("stores metadata for tool list changed handlers", () => {
    const metadata = Reflect.getMetadata(
      MCP_TOOL_LIST_CHANGED_METADATA_KEY,
      TestHandlers.prototype,
      "onToolListChanged",
    ) as McpToolListChangedMetadata;

    assert.exists(metadata);
    expect(metadata.clients).toEqual(["test-client"]);
  });
});
