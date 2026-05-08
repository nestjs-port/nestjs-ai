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

import type { ElicitRequest, ElicitResult } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";

import { ElicitationTestHelper } from "./elicitation-test-helper.js";
import { McpElicitationMethodCallback } from "../mcp-elicitation-method-callback.js";
import { McpElicitationMethodException } from "../mcp-elicitation-method-callback.js";
import { McpElicitationMethodCallbackExample } from "./mcp-elicitation-method-callback-example.spec.js";

const SAMPLE_REQUEST = ElicitationTestHelper.createSampleRequest();

describe("McpElicitationMethodCallback", () => {
  class RuntimeError extends Error {}

  it("test valid method accept", async () => {
    const bean = new McpElicitationMethodCallbackExample();
    const callback = new McpElicitationMethodCallback({
      provider: bean,
      propertyKey: "handleElicitationRequest",
    });

    await expect(callback.apply(SAMPLE_REQUEST)).resolves.toMatchObject({
      action: "accept",
      content: {
        userInput: "Example async user input",
        confirmed: true,
      },
    });
  });

  it("test valid method decline", async () => {
    const bean = new McpElicitationMethodCallbackExample();
    const callback = new McpElicitationMethodCallback({
      provider: bean,
      propertyKey: "handleDeclineElicitationRequest",
    });

    await expect(callback.apply(SAMPLE_REQUEST)).resolves.toEqual({
      action: "decline",
      content: undefined,
      _meta: undefined,
    });
  });

  it("test valid method cancel", async () => {
    const bean = new McpElicitationMethodCallbackExample();
    const callback = new McpElicitationMethodCallback({
      provider: bean,
      propertyKey: "handleCancelElicitationRequest",
    });

    await expect(callback.apply(SAMPLE_REQUEST)).resolves.toEqual({
      action: "cancel",
      content: undefined,
      _meta: undefined,
    });
  });

  it("test sync method", async () => {
    const bean = new McpElicitationMethodCallbackExample();
    const callback = new McpElicitationMethodCallback({
      provider: bean,
      propertyKey: "handleSyncElicitationRequest",
    });

    await expect(callback.apply(SAMPLE_REQUEST)).resolves.toMatchObject({
      action: "accept",
      content: {
        syncResponse:
          "This was returned synchronously but wrapped in Promise in Java",
        requestMessage: "Please provide your input for the following task",
      },
    });
  });

  it("test structured result conversion", async () => {
    const bean = new McpElicitationMethodCallbackExample();
    const callback = new McpElicitationMethodCallback({
      provider: bean,
      propertyKey: "handleStructuredElicitationRequest",
    });

    await expect(callback.apply(SAMPLE_REQUEST)).resolves.toEqual({
      action: "accept",
      content: {
        structuredResponse: "Structured response",
        requestMessage: "Please provide your input for the following task",
      },
      _meta: {
        source: "structured",
      },
    });
  });

  it("test null request", async () => {
    const bean = new McpElicitationMethodCallbackExample();
    const callback = new McpElicitationMethodCallback({
      provider: bean,
      propertyKey: "handleElicitationRequest",
    });

    await expect(
      callback.apply(null as unknown as ElicitRequest),
    ).rejects.toThrow("Request must not be null");
  });

  it("test method invocation error", async () => {
    const bean = new (class extends McpElicitationMethodCallbackExample {
      override handleElicitationRequest(_request: ElicitRequest): ElicitResult {
        throw new RuntimeError("Test exception");
      }
    })();
    const callback = new McpElicitationMethodCallback({
      provider: bean,
      propertyKey: "handleElicitationRequest",
    });

    await expect(callback.apply(SAMPLE_REQUEST)).rejects.toThrow(
      McpElicitationMethodException,
    );
  });

  it("test custom request content", async () => {
    const bean = new McpElicitationMethodCallbackExample();
    const callback = new McpElicitationMethodCallback({
      provider: bean,
      propertyKey: "handleSyncElicitationRequest",
    });

    const customRequest = {
      ...ElicitationTestHelper.createSampleRequest("Custom async prompt", {
        customKey: "customValue",
        priority: "high",
        async: true,
      }),
    } as ElicitRequest;

    await expect(callback.apply(customRequest)).resolves.toMatchObject({
      action: "accept",
      content: {
        requestMessage: "Custom async prompt",
      },
    });
  });

  it("test mono error handling", async () => {
    const bean = {
      ...new McpElicitationMethodCallbackExample(),
      handleElicitationRequest(_request: ElicitRequest): Promise<ElicitResult> {
        return Promise.reject(new RuntimeError("Async test exception"));
      },
    } as unknown as McpElicitationMethodCallbackExample;
    const callback = new McpElicitationMethodCallback({
      provider: bean,
      propertyKey: "handleElicitationRequest",
    });

    await expect(callback.apply(SAMPLE_REQUEST)).rejects.toThrow(
      McpElicitationMethodException,
    );
  });
});
