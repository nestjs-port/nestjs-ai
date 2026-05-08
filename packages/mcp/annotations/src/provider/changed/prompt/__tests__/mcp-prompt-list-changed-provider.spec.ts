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

import "reflect-metadata";

import type { Prompt } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import { McpPromptListChanged } from "../../../../mcp-prompt-list-changed.js";
import { McpPromptListChangedProvider } from "../mcp-prompt-list-changed-provider.js";

describe("McpPromptListChangedProvider", () => {
  const TEST_PROMPTS: Prompt[] = [
    { name: "test-prompt-1", description: "Test Prompt 1", arguments: [] },
    { name: "test-prompt-2", description: "Test Prompt 2", arguments: [] },
  ];

  it("testGetPromptListChangedSpecifications", async () => {
    const handler = new PromptListChangedHandler();
    const provider = new McpPromptListChangedProvider({
      promptListChangedObjects: [handler],
    });

    const specifications = provider.getPromptListChangedSpecifications();
    const consumers = specifications.map(
      (spec) => spec.promptListChangeHandler,
    );

    expect(consumers).toHaveLength(2);
    expect(specifications).toHaveLength(2);

    await consumers[0]?.(null, TEST_PROMPTS);

    expect(handler.lastUpdatedPrompts).toEqual(TEST_PROMPTS);
    expect(handler.lastUpdatedPrompts).toHaveLength(2);
    expect(handler.lastUpdatedPrompts?.[0]?.name).toBe("test-prompt-1");
    expect(handler.lastUpdatedPrompts?.[1]?.name).toBe("test-prompt-2");

    await consumers[1]?.(null, TEST_PROMPTS);

    expect(handler.lastUpdatedPrompts).toEqual(TEST_PROMPTS);
  });

  it("testClientIdSpecifications", () => {
    const handler = new PromptListChangedHandler();
    const provider = new McpPromptListChangedProvider({
      promptListChangedObjects: [handler],
    });

    const specifications = provider.getPromptListChangedSpecifications();

    expect(specifications).toHaveLength(2);
    expect(specifications.map((spec) => spec.clients).flat()).toEqual(
      expect.arrayContaining(["test-client", "my-client-id"]),
    );
  });

  it("testEmptyList", () => {
    const provider = new McpPromptListChangedProvider({
      promptListChangedObjects: [],
    });

    expect(provider.getPromptListChangedSpecifications()).toHaveLength(0);
  });

  it("testMultipleObjects", () => {
    const provider = new McpPromptListChangedProvider({
      promptListChangedObjects: [
        new PromptListChangedHandler(),
        new PromptListChangedHandler(),
      ],
    });

    expect(provider.getPromptListChangedSpecifications()).toHaveLength(4);
  });

  it("testConsumerFunctionality", async () => {
    const handler = new PromptListChangedHandler();
    const provider = new McpPromptListChangedProvider({
      promptListChangedObjects: [handler],
    });

    const consumer =
      provider.getPromptListChangedSpecifications()[0]?.promptListChangeHandler;
    expect(consumer).toBeDefined();

    const emptyList: Prompt[] = [];
    await consumer?.(null, emptyList);
    expect(handler.lastUpdatedPrompts).toEqual(emptyList);
    expect(handler.lastUpdatedPrompts).toHaveLength(0);

    await consumer?.(null, TEST_PROMPTS);
    expect(handler.lastUpdatedPrompts).toEqual(TEST_PROMPTS);
    expect(handler.lastUpdatedPrompts).toHaveLength(2);
  });

  it("testNonAnnotatedMethodsIgnored", () => {
    const handler = new PromptListChangedHandler();
    const provider = new McpPromptListChangedProvider({
      promptListChangedObjects: [handler],
    });

    expect(provider.getPromptListChangedSpecifications()).toHaveLength(2);
  });
});

class PromptListChangedHandler {
  public lastUpdatedPrompts: Prompt[] | null = null;

  @McpPromptListChanged({ clients: ["my-client-id"] })
  public handlePromptListChanged(updatedPrompts: Prompt[]): void {
    this.lastUpdatedPrompts = updatedPrompts;
  }

  @McpPromptListChanged({ clients: ["test-client"] })
  public handlePromptListChangedWithClientId(updatedPrompts: Prompt[]): void {
    this.lastUpdatedPrompts = updatedPrompts;
  }

  public notAnnotatedMethod(_updatedPrompts: Prompt[]): void {
    // This method should be ignored
  }
}
