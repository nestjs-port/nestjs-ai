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

import type {
  CreateMessageRequest,
  CreateMessageResult,
} from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import { McpSampling } from "../../../mcp-sampling.js";
import { McpSamplingProvider } from "../mcp-sampling-provider.js";

describe("McpSamplingProvider", () => {
  it("test getSamplingSpecifications", async () => {
    // Create a class with only one valid sampling method
    class SingleValidMethod {
      @McpSampling({ clients: ["test-client"] })
      public handleAsyncSamplingRequest(
        _request: CreateMessageRequest,
      ): Promise<CreateMessageResult> {
        return Promise.resolve({
          role: "assistant",
          content: {
            type: "text",
            text: "This is an async response to the sampling request",
          },
          model: "test-model",
        });
      }
    }

    const example = new SingleValidMethod();
    const provider = new McpSamplingProvider({
      samplingObjects: [example],
    });

    const samplingSpecs = provider.getSamplingSpecifications();

    const handler = samplingSpecs[0]?.samplingHandler;
    expect(handler).toBeDefined();

    const result = await handler?.({
      method: "sampling/createMessage",
      params: {
        messages: [],
      },
    } as never);

    expect(result).toBeDefined();
    expect(result?.content).toMatchObject({
      type: "text",
      text: "This is an async response to the sampling request",
    });
  });

  it("test null samplingObjects", () => {
    expect(
      () =>
        new McpSamplingProvider({
          samplingObjects: null as never,
        }),
    ).toThrow("samplingObjects can't be null!");
  });

  it("test direct result method", async () => {
    // Create a class with only the direct result method
    class DirectResultOnly {
      @McpSampling({ clients: ["test-client"] })
      public handleDirectSamplingRequest(
        _request: CreateMessageRequest,
      ): CreateMessageResult {
        return {
          role: "assistant",
          content: {
            type: "text",
            text: "This is a direct response to the sampling request",
          },
          model: "test-model",
        };
      }
    }

    const example = new DirectResultOnly();
    const provider = new McpSamplingProvider({
      samplingObjects: [example],
    });

    const samplingSpecs = provider.getSamplingSpecifications();

    const handler = samplingSpecs[0]?.samplingHandler;
    expect(handler).toBeDefined();

    const result = await handler?.({
      method: "sampling/createMessage",
      params: {
        messages: [],
      },
    } as never);

    expect(result).toBeDefined();
    expect(result?.content).toMatchObject({
      type: "text",
      text: "This is a direct response to the sampling request",
    });
  });
});
