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
  Client as McpClient,
} from "@modelcontextprotocol/client";
import { McpSampling } from "@nestjs-ai/mcp-annotations";
import type { ProviderInstanceExplorer } from "@nestjs-port/core";
import { describe, expect, it, vi } from "vitest";

import { McpClientAnnotationRegistrar } from "../mcp-client-annotation-registrar.js";
import { McpClientSamplingScanner } from "../mcp-client-sampling-scanner.js";

describe("McpClientAnnotationRegistrar", () => {
  it("registers sampling handlers for matching clients", () => {
    class SamplingProvider {
      @McpSampling({ clients: ["server-a"] })
      handleServerA(_request: CreateMessageRequest): CreateMessageResult {
        return {
          role: "assistant",
          content: { type: "text", text: "a" },
          model: "test-model-a",
        };
      }

      @McpSampling({ clients: ["server-b"] })
      handleServerB(_request: CreateMessageRequest): CreateMessageResult {
        return {
          role: "assistant",
          content: { type: "text", text: "b" },
          model: "test-model-b",
        };
      }
    }

    const clientASetRequestHandler = vi.fn();
    const clientBSetRequestHandler = vi.fn();

    const clientA = {
      setRequestHandler: clientASetRequestHandler,
    } as unknown as McpClient;
    const clientB = {
      setRequestHandler: clientBSetRequestHandler,
    } as unknown as McpClient;

    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [new SamplingProvider()],
    };

    const registrar = new McpClientAnnotationRegistrar(
      { annotations: { sampling: true } },
      [
        { clientName: "server-a", mcpClient: clientA },
        { clientName: "server-b", mcpClient: clientB },
      ],
      new McpClientSamplingScanner(explorer),
    );

    registrar.onModuleInit();

    expect(clientASetRequestHandler).toHaveBeenCalledTimes(1);
    expect(clientASetRequestHandler).toHaveBeenCalledWith(
      "sampling/createMessage",
      expect.any(Function),
    );
    expect(clientBSetRequestHandler).toHaveBeenCalledTimes(1);
    expect(clientBSetRequestHandler).toHaveBeenCalledWith(
      "sampling/createMessage",
      expect.any(Function),
    );
  });

  it("throws when more than one sampling method targets the same client", () => {
    class SamplingProvider {
      @McpSampling({ clients: ["server-a"] })
      handleServerA(_request: CreateMessageRequest): CreateMessageResult {
        return {
          role: "assistant",
          content: { type: "text", text: "a" },
          model: "test-model-a",
        };
      }

      @McpSampling({ clients: ["server-a"] })
      handleServerAAgain(_request: CreateMessageRequest): CreateMessageResult {
        return {
          role: "assistant",
          content: { type: "text", text: "a2" },
          model: "test-model-a2",
        };
      }
    }

    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [new SamplingProvider()],
    };

    const registrar = new McpClientAnnotationRegistrar(
      { annotations: { sampling: true } },
      [
        {
          clientName: "server-a",
          mcpClient: {
            setRequestHandler: vi.fn(),
          } as unknown as McpClient,
        },
      ],
      new McpClientSamplingScanner(explorer),
    );

    expect(() => registrar.onModuleInit()).toThrowError(
      /Multiple @McpSampling methods matched client "server-a"/,
    );
  });
});
