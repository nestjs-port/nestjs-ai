/*
 * Copyright 2026-present the original author or authors.
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

import type {
  CreateMessageRequest,
  CreateMessageResult,
} from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";

import { McpSamplingMethodException } from "../abstract-mcp-sampling-method-callback.js";
import { McpSamplingMethodCallback } from "../mcp-sampling-method-callback.js";
import { McpSamplingMethodCallbackExample } from "./mcp-sampling-method-callback-example.spec.js";
import { SamplingTestHelper } from "./sampling-test-helper.js";

const SAMPLE_REQUEST = SamplingTestHelper.createSampleRequest();

describe("McpSamplingMethodCallback", () => {
  class RuntimeError extends Error {}

  it("test valid method", async () => {
    const bean = new McpSamplingMethodCallbackExample();
    const callback = new McpSamplingMethodCallback({
      provider: bean,
      propertyKey: "handleSamplingRequest",
    });

    const result = await callback.apply(SAMPLE_REQUEST);
    expect(result).not.toBeNull();
    expect(result.content.type).toBe("text");
    expect((result.content as { text: string }).text).toBe(
      "This is a response to the sampling request",
    );
  });

  it("test valid async method", async () => {
    const bean = new McpSamplingMethodCallbackExample();
    const callback = new McpSamplingMethodCallback({
      provider: bean,
      propertyKey: "handleAsyncSamplingRequest",
    });

    const result = await callback.apply(SAMPLE_REQUEST);
    expect(result).not.toBeNull();
    expect(result.content.type).toBe("text");
    expect((result.content as { text: string }).text).toBe(
      "This is an async response to the sampling request",
    );
  });

  it("test direct result method", async () => {
    const bean = new McpSamplingMethodCallbackExample();
    const callback = new McpSamplingMethodCallback({
      provider: bean,
      propertyKey: "handleDirectSamplingRequest",
    });

    const result = await callback.apply(SAMPLE_REQUEST);
    expect(result).not.toBeNull();
    expect(result.content.type).toBe("text");
    expect((result.content as { text: string }).text).toBe(
      "This is a direct response to the sampling request",
    );
  });

  it("test null request", async () => {
    const bean = new McpSamplingMethodCallbackExample();
    const callback = new McpSamplingMethodCallback({
      provider: bean,
      propertyKey: "handleSamplingRequest",
    });

    await expect(
      callback.apply(null as unknown as CreateMessageRequest),
    ).rejects.toThrow("Request must not be null");
  });

  it("test null provider", () => {
    expect(
      () =>
        new McpSamplingMethodCallback({
          provider: null as unknown as object,
          propertyKey: "handleSamplingRequest",
        }),
    ).toThrow("Provider can't be null!");
  });

  it("test null property key", () => {
    const bean = new McpSamplingMethodCallbackExample();
    expect(
      () =>
        new McpSamplingMethodCallback({
          provider: bean,
          propertyKey: null as unknown as string,
        }),
    ).toThrow("Method can't be null!");
  });

  it("test method invocation error", async () => {
    // Create a method that will throw an exception when invoked
    const bean = new (class extends McpSamplingMethodCallbackExample {
      override handleSamplingRequest(
        _request: CreateMessageRequest,
      ): CreateMessageResult {
        throw new RuntimeError("Test exception");
      }
    })();
    const callback = new McpSamplingMethodCallback({
      provider: bean,
      propertyKey: "handleSamplingRequest",
    });

    await expect(callback.apply(SAMPLE_REQUEST)).rejects.toThrow(
      McpSamplingMethodException,
    );
    await expect(callback.apply(SAMPLE_REQUEST)).rejects.toThrow(
      "Error invoking sampling method",
    );
  });

  it("test async method invocation error", async () => {
    // Create a method that will reject the returned Promise when invoked
    const bean = {
      ...new McpSamplingMethodCallbackExample(),
      handleAsyncSamplingRequest(
        _request: CreateMessageRequest,
      ): Promise<CreateMessageResult> {
        return Promise.reject(new RuntimeError("Async test exception"));
      },
    } as unknown as McpSamplingMethodCallbackExample;
    const callback = new McpSamplingMethodCallback({
      provider: bean,
      propertyKey: "handleAsyncSamplingRequest",
    });

    await expect(callback.apply(SAMPLE_REQUEST)).rejects.toThrow(
      McpSamplingMethodException,
    );
  });
});
