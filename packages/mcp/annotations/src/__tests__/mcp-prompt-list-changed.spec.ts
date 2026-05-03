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
import type { Prompt } from "@modelcontextprotocol/server";
import { MCP_PROMPT_LIST_CHANGED_METADATA_KEY } from "../metadata.js";
import { McpPromptListChanged } from "../mcp-prompt-list-changed.js";
import type { McpPromptListChangedMetadata } from "../mcp-prompt-list-changed.js";

class McpPromptListChangedTypeExamples {
  @McpPromptListChanged({ clients: ["test-client"] })
  validSync(updatedPrompts: Prompt[]): void {
    void updatedPrompts.length;
  }

  @McpPromptListChanged({ clients: ["test-client"] })
  async validAsync(updatedPrompts: Prompt[]): Promise<void> {
    void updatedPrompts.length;
  }

  // @ts-expect-error @McpPromptListChanged only supports methods with exactly one Prompt[] parameter
  @McpPromptListChanged({ clients: ["test-client"] })
  noArguments() {}

  // @ts-expect-error @McpPromptListChanged only supports methods with a Prompt[] parameter
  @McpPromptListChanged({ clients: ["test-client"] })
  wrongArgumentType(_value: string) {}

  // @ts-expect-error @McpPromptListChanged only supports methods returning void or Promise<void>
  @McpPromptListChanged({ clients: ["test-client"] })
  wrongReturnType(updatedPrompts: Prompt[]) {
    return updatedPrompts.length;
  }

  // @ts-expect-error @McpPromptListChanged only supports methods with exactly one Prompt[] parameter
  @McpPromptListChanged({ clients: ["test-client"] })
  tooManyArguments(updatedPrompts: Prompt[], _context: string) {
    void updatedPrompts.length;
    void _context;
  }
}

void McpPromptListChangedTypeExamples;

describe("McpPromptListChanged", () => {
  class TestHandlers {
    @McpPromptListChanged({ clients: ["test-client"] })
    onPromptListChanged(updatedPrompts: Prompt[]): void {
      void updatedPrompts.length;
    }
  }

  it("stores metadata for prompt list changed handlers", () => {
    const metadata = Reflect.getMetadata(
      MCP_PROMPT_LIST_CHANGED_METADATA_KEY,
      TestHandlers.prototype,
      "onPromptListChanged",
    ) as McpPromptListChangedMetadata;

    assert.exists(metadata);
    expect(metadata.clients).toEqual(["test-client"]);
  });
});
