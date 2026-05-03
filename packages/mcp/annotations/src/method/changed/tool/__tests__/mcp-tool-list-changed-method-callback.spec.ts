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
import type { Tool } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { McpToolListChanged } from "../../../../mcp-tool-list-changed.js";
import { McpToolListChangedConsumerMethodException } from "../abstract-mcp-tool-list-changed-method-callback.js";
import { McpToolListChangedMethodCallback } from "../mcp-tool-list-changed-method-callback.js";

const TEST_TOOLS = [
  { name: "test-tool-1", description: "Test Tool 1" } as Tool,
  { name: "test-tool-2", description: "Test Tool 2" } as Tool,
];

describe("McpToolListChangedMethodCallback", () => {
  class ValidMethods {
    lastUpdatedTools: Tool[] | null = null;

    @McpToolListChanged({ clients: ["my-client-id"] })
    async handleToolListChanged(updatedTools: Tool[]): Promise<void> {
      this.lastUpdatedTools = updatedTools;
    }

    @McpToolListChanged({ clients: ["my-client-id"] })
    handleToolListChangedVoid(updatedTools: Tool[]): void {
      this.lastUpdatedTools = updatedTools;
    }
  }

  class ThrowingMethod {
    @McpToolListChanged({ clients: ["my-client-id"] })
    handleToolListChanged(_updatedTools: Tool[]): Promise<void> {
      return Promise.reject(new RuntimeError("Test exception"));
    }
  }

  class ThrowingVoidMethod {
    @McpToolListChanged({ clients: ["my-client-id"] })
    handleToolListChanged(_updatedTools: Tool[]): void {
      throw new RuntimeError("Test exception");
    }
  }

  class RuntimeError extends Error {}

  it("test valid method with tool list", async () => {
    const bean = new ValidMethods();

    const callback = new McpToolListChangedMethodCallback({
      provider: bean,
      propertyKey: "handleToolListChanged",
    });

    await expect(callback.apply(TEST_TOOLS)).resolves.toBeUndefined();

    expect(bean.lastUpdatedTools).toEqual(TEST_TOOLS);
    expect(bean.lastUpdatedTools).toHaveLength(2);
    expect(bean.lastUpdatedTools?.[0].name).toBe("test-tool-1");
    expect(bean.lastUpdatedTools?.[1].name).toBe("test-tool-2");
  });

  it("test valid void method", async () => {
    const bean = new ValidMethods();

    const callback = new McpToolListChangedMethodCallback({
      provider: bean,
      propertyKey: "handleToolListChangedVoid",
    });

    await expect(callback.apply(TEST_TOOLS)).resolves.toBeUndefined();

    expect(bean.lastUpdatedTools).toEqual(TEST_TOOLS);
    expect(bean.lastUpdatedTools).toHaveLength(2);
    expect(bean.lastUpdatedTools?.[0].name).toBe("test-tool-1");
    expect(bean.lastUpdatedTools?.[1].name).toBe("test-tool-2");
  });

  it("test null tool list", async () => {
    const bean = new ValidMethods();

    const callback = new McpToolListChangedMethodCallback({
      provider: bean,
      propertyKey: "handleToolListChanged",
    });

    await expect(callback.apply(null as unknown as Tool[])).rejects.toThrow(
      "Updated tools list must not be null",
    );
  });

  it("test empty tool list", async () => {
    const bean = new ValidMethods();

    const callback = new McpToolListChangedMethodCallback({
      provider: bean,
      propertyKey: "handleToolListChanged",
    });

    const emptyList: Tool[] = [];
    await expect(callback.apply(emptyList)).resolves.toBeUndefined();

    expect(bean.lastUpdatedTools).toEqual(emptyList);
    expect(bean.lastUpdatedTools).toHaveLength(0);
  });

  it("test method invocation exception", async () => {
    // Test class that throws an exception in the method
    const bean = new ThrowingMethod();

    const callback = new McpToolListChangedMethodCallback({
      provider: bean,
      propertyKey: "handleToolListChanged",
    });

    await expect(callback.apply(TEST_TOOLS)).rejects.toThrow(
      McpToolListChangedConsumerMethodException,
    );
  });

  it("test method invocation exception void", async () => {
    // Test class that throws an exception in a void method
    const bean = new ThrowingVoidMethod();

    const callback = new McpToolListChangedMethodCallback({
      provider: bean,
      propertyKey: "handleToolListChanged",
    });

    await expect(callback.apply(TEST_TOOLS)).rejects.toThrow(
      McpToolListChangedConsumerMethodException,
    );
  });
});
