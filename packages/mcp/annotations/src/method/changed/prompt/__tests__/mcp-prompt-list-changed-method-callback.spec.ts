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
import { McpPromptListChangedMethodCallback } from "../mcp-prompt-list-changed-method-callback.js";
import { McpPromptListChangedConsumerMethodException } from "../abstract-mcp-prompt-list-changed-method-callback.js";

const TEST_PROMPTS = [
  { name: "test-prompt-1", title: "Test Prompt 1" } as Prompt,
  { name: "test-prompt-2", title: "Test Prompt 2" } as Prompt,
];

describe("McpPromptListChangedMethodCallback", () => {
  class ValidMethods {
    lastUpdatedPrompts: Prompt[] | null = null;

    @McpPromptListChanged({ clients: ["my-client-id"] })
    async handlePromptListChanged(updatedPrompts: Prompt[]): Promise<void> {
      this.lastUpdatedPrompts = updatedPrompts;
    }

    @McpPromptListChanged({ clients: ["my-client-id"] })
    handlePromptListChangedVoid(updatedPrompts: Prompt[]): void {
      this.lastUpdatedPrompts = updatedPrompts;
    }
  }

  class ThrowingMethod {
    @McpPromptListChanged({ clients: ["my-client-id"] })
    handlePromptListChanged(_updatedPrompts: Prompt[]): Promise<void> {
      return Promise.reject(new RuntimeError("Test exception"));
    }
  }

  class ThrowingVoidMethod {
    @McpPromptListChanged({ clients: ["my-client-id"] })
    handlePromptListChanged(_updatedPrompts: Prompt[]): void {
      throw new RuntimeError("Test exception");
    }
  }

  class RuntimeError extends Error {}

  it("test valid method with prompt list", async () => {
    const bean = new ValidMethods();

    const callback = new McpPromptListChangedMethodCallback({
      provider: bean,
      propertyKey: "handlePromptListChanged",
    });

    await expect(callback.apply(TEST_PROMPTS)).resolves.toBeUndefined();

    expect(bean.lastUpdatedPrompts).toEqual(TEST_PROMPTS);
    expect(bean.lastUpdatedPrompts).toHaveLength(2);
    expect(bean.lastUpdatedPrompts?.[0].name).toBe("test-prompt-1");
    expect(bean.lastUpdatedPrompts?.[1].name).toBe("test-prompt-2");
  });

  it("test valid void method", async () => {
    const bean = new ValidMethods();

    const callback = new McpPromptListChangedMethodCallback({
      provider: bean,
      propertyKey: "handlePromptListChangedVoid",
    });

    await expect(callback.apply(TEST_PROMPTS)).resolves.toBeUndefined();

    expect(bean.lastUpdatedPrompts).toEqual(TEST_PROMPTS);
    expect(bean.lastUpdatedPrompts).toHaveLength(2);
    expect(bean.lastUpdatedPrompts?.[0].name).toBe("test-prompt-1");
    expect(bean.lastUpdatedPrompts?.[1].name).toBe("test-prompt-2");
  });

  it("test null prompt list", async () => {
    const bean = new ValidMethods();

    const callback = new McpPromptListChangedMethodCallback({
      provider: bean,
      propertyKey: "handlePromptListChanged",
    });

    await expect(callback.apply(null as unknown as Prompt[])).rejects.toThrow(
      "Updated prompts list must not be null",
    );
  });

  it("test empty prompt list", async () => {
    const bean = new ValidMethods();

    const callback = new McpPromptListChangedMethodCallback({
      provider: bean,
      propertyKey: "handlePromptListChanged",
    });

    const emptyList: Prompt[] = [];
    await expect(callback.apply(emptyList)).resolves.toBeUndefined();

    expect(bean.lastUpdatedPrompts).toEqual(emptyList);
    expect(bean.lastUpdatedPrompts).toHaveLength(0);
  });

  it("test method invocation exception", async () => {
    // Test class that throws an exception in the method
    const bean = new ThrowingMethod();

    const callback = new McpPromptListChangedMethodCallback({
      provider: bean,
      propertyKey: "handlePromptListChanged",
    });

    await expect(callback.apply(TEST_PROMPTS)).rejects.toThrow(
      McpPromptListChangedConsumerMethodException,
    );
  });

  it("test method invocation exception void", async () => {
    // Test class that throws an exception in a void method
    const bean = new ThrowingVoidMethod();

    const callback = new McpPromptListChangedMethodCallback({
      provider: bean,
      propertyKey: "handlePromptListChanged",
    });

    await expect(callback.apply(TEST_PROMPTS)).rejects.toThrow(
      McpPromptListChangedConsumerMethodException,
    );
  });
});
