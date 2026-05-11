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
import { McpResourceListChangedProvider } from "../mcp-resource-list-changed-provider.js";

describe("McpResourceListChangedProvider", () => {
  const TEST_RESOURCES: Resource[] = [
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

  it("testGetResourceListChangedSpecifications", async () => {
    const handler = new ResourceListChangedHandler();
    const provider = new McpResourceListChangedProvider([handler]);

    const specifications = provider.getResourceListChangedSpecifications();
    const consumers = specifications.map(
      (spec) => spec.resourceListChangeHandler,
    );

    expect(consumers).toHaveLength(2);
    expect(specifications).toHaveLength(2);

    await consumers[0]?.(null, TEST_RESOURCES);

    expect(handler.lastUpdatedResources).toEqual(TEST_RESOURCES);
    expect(handler.lastUpdatedResources).toHaveLength(2);
    expect(handler.lastUpdatedResources?.[0]?.name).toBe("test-resource-1");
    expect(handler.lastUpdatedResources?.[1]?.name).toBe("test-resource-2");

    await consumers[1]?.(null, TEST_RESOURCES);

    expect(handler.lastUpdatedResources).toEqual(TEST_RESOURCES);
  });

  it("testClientIdSpecifications", () => {
    const handler = new ResourceListChangedHandler();
    const provider = new McpResourceListChangedProvider([handler]);

    const specifications = provider.getResourceListChangedSpecifications();

    expect(specifications).toHaveLength(2);
    expect(specifications.map((spec) => spec.clients).flat()).toEqual(
      expect.arrayContaining(["client1", "test-client"]),
    );
  });

  it("testEmptyList", () => {
    const provider = new McpResourceListChangedProvider([]);

    expect(provider.getResourceListChangedSpecifications()).toHaveLength(0);
  });

  it("testMultipleObjects", () => {
    const provider = new McpResourceListChangedProvider([
      new ResourceListChangedHandler(),
      new ResourceListChangedHandler(),
    ]);

    expect(provider.getResourceListChangedSpecifications()).toHaveLength(4);
  });

  it("testConsumerFunctionality", async () => {
    const handler = new ResourceListChangedHandler();
    const provider = new McpResourceListChangedProvider([handler]);

    const consumer =
      provider.getResourceListChangedSpecifications()[0]
        ?.resourceListChangeHandler;
    expect(consumer).toBeDefined();

    const emptyList: Resource[] = [];
    await consumer?.(null, emptyList);
    expect(handler.lastUpdatedResources).toEqual(emptyList);
    expect(handler.lastUpdatedResources).toHaveLength(0);

    await consumer?.(null, TEST_RESOURCES);
    expect(handler.lastUpdatedResources).toEqual(TEST_RESOURCES);
    expect(handler.lastUpdatedResources).toHaveLength(2);
  });

  it("testNonAnnotatedMethodsIgnored", () => {
    const handler = new ResourceListChangedHandler();
    const provider = new McpResourceListChangedProvider([handler]);

    expect(provider.getResourceListChangedSpecifications()).toHaveLength(2);
  });
});

class ResourceListChangedHandler {
  public lastUpdatedResources: Resource[] | null = null;

  @McpResourceListChanged({ clients: ["client1"] })
  public handleResourceListChanged(updatedResources: Resource[]): void {
    this.lastUpdatedResources = updatedResources;
  }

  @McpResourceListChanged({ clients: ["test-client"] })
  public handleResourceListChangedWithClientId(
    updatedResources: Resource[],
  ): void {
    this.lastUpdatedResources = updatedResources;
  }

  public notAnnotatedMethod(_updatedResources: Resource[]): void {
    // This method should be ignored
  }
}
