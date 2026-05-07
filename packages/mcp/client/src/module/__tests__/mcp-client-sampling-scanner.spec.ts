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
import { McpSampling } from "@nestjs-ai/mcp-annotations";
import type { ProviderInstanceExplorer } from "@nestjs-port/core";
import { describe, expect, it } from "vitest";

import { McpClientSamplingScanner } from "../mcp-client-sampling-scanner.js";

describe("McpClientSamplingScanner", () => {
  it("discovers sampling specifications from provider instances", () => {
    class SamplingProvider {
      @McpSampling({ clients: ["test-client"] })
      samplingHandler(_request: CreateMessageRequest): CreateMessageResult {
        return {
          role: "assistant",
          content: { type: "text", text: "ok" },
          model: "test-model",
        };
      }
    }

    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [new SamplingProvider()],
    };

    const scanner = new McpClientSamplingScanner(explorer);
    const specs = scanner.discoverSamplingSpecifications();

    expect(specs).toHaveLength(1);
    expect(specs[0]?.clients).toEqual(["test-client"]);
  });
});
