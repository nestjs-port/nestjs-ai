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
import type { Resource } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { McpResourceListChanged } from "../../../../mcp-resource-list-changed.js";
import { McpResourceListChangedConsumerMethodException } from "../abstract-mcp-resource-list-changed-method-callback.js";
import { McpResourceListChangedMethodCallback } from "../mcp-resource-list-changed-method-callback.js";

const TEST_RESOURCES = [
  {
    uri: "file:///test1.txt",
    name: "test-resource-1",
    description: "Test Resource 1",
    mimeType: "text/plain",
  } as Resource,
  {
    uri: "file:///test2.txt",
    name: "test-resource-2",
    description: "Test Resource 2",
    mimeType: "text/plain",
  } as Resource,
];

describe("McpResourceListChangedMethodCallback", () => {
  class ValidMethods {
    lastUpdatedResources: Resource[] | null = null;

    @McpResourceListChanged({ clients: ["my-client-id"] })
    async handleResourceListChanged(
      updatedResources: Resource[],
    ): Promise<void> {
      this.lastUpdatedResources = updatedResources;
    }

    @McpResourceListChanged({ clients: ["my-client-id"] })
    handleResourceListChangedVoid(updatedResources: Resource[]): void {
      this.lastUpdatedResources = updatedResources;
    }
  }

  class ThrowingMethod {
    @McpResourceListChanged({ clients: ["my-client-id"] })
    handleResourceListChanged(_updatedResources: Resource[]): Promise<void> {
      return Promise.reject(new RuntimeError("Test exception"));
    }
  }

  class ThrowingVoidMethod {
    @McpResourceListChanged({ clients: ["my-client-id"] })
    handleResourceListChanged(_updatedResources: Resource[]): void {
      throw new RuntimeError("Test exception");
    }
  }

  class RuntimeError extends Error {}

  it("test valid method with resource list", async () => {
    const bean = new ValidMethods();

    const callback = new McpResourceListChangedMethodCallback({
      provider: bean,
      propertyKey: "handleResourceListChanged",
    });

    await expect(callback.apply(TEST_RESOURCES)).resolves.toBeUndefined();

    expect(bean.lastUpdatedResources).toEqual(TEST_RESOURCES);
    expect(bean.lastUpdatedResources).toHaveLength(2);
    expect(bean.lastUpdatedResources?.[0].name).toBe("test-resource-1");
    expect(bean.lastUpdatedResources?.[1].name).toBe("test-resource-2");
  });

  it("test valid void method", async () => {
    const bean = new ValidMethods();

    const callback = new McpResourceListChangedMethodCallback({
      provider: bean,
      propertyKey: "handleResourceListChangedVoid",
    });

    await expect(callback.apply(TEST_RESOURCES)).resolves.toBeUndefined();

    expect(bean.lastUpdatedResources).toEqual(TEST_RESOURCES);
    expect(bean.lastUpdatedResources).toHaveLength(2);
    expect(bean.lastUpdatedResources?.[0].name).toBe("test-resource-1");
    expect(bean.lastUpdatedResources?.[1].name).toBe("test-resource-2");
  });

  it("test null resource list", async () => {
    const bean = new ValidMethods();

    const callback = new McpResourceListChangedMethodCallback({
      provider: bean,
      propertyKey: "handleResourceListChanged",
    });

    await expect(callback.apply(null as unknown as Resource[])).rejects.toThrow(
      "Updated resources list must not be null",
    );
  });

  it("test empty resource list", async () => {
    const bean = new ValidMethods();

    const callback = new McpResourceListChangedMethodCallback({
      provider: bean,
      propertyKey: "handleResourceListChanged",
    });

    const emptyList: Resource[] = [];
    await expect(callback.apply(emptyList)).resolves.toBeUndefined();

    expect(bean.lastUpdatedResources).toEqual(emptyList);
    expect(bean.lastUpdatedResources).toHaveLength(0);
  });

  it("test method invocation exception", async () => {
    // Test class that throws an exception in the method
    const bean = new ThrowingMethod();

    const callback = new McpResourceListChangedMethodCallback({
      provider: bean,
      propertyKey: "handleResourceListChanged",
    });

    await expect(callback.apply(TEST_RESOURCES)).rejects.toThrow(
      McpResourceListChangedConsumerMethodException,
    );
  });

  it("test method invocation exception void", async () => {
    // Test class that throws an exception in a void method
    const bean = new ThrowingVoidMethod();

    const callback = new McpResourceListChangedMethodCallback({
      provider: bean,
      propertyKey: "handleResourceListChanged",
    });

    await expect(callback.apply(TEST_RESOURCES)).rejects.toThrow(
      McpResourceListChangedConsumerMethodException,
    );
  });
});
