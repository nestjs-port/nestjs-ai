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

import type { ElicitRequest } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";

import { McpElicitation } from "../../../mcp-elicitation.js";
import { StructuredElicitResult } from "../../../context/index.js";
import { McpElicitationProvider } from "../mcp-elicitation-provider.js";

describe("McpElicitationProvider", () => {
  it("testGetElicitationHandler", async () => {
    const provider = new McpElicitationProvider([new TestElicitationHandler()]);

    const specification = provider.getElicitationSpecifications()[0];
    const handler = specification?.elicitationHandler;

    expect(handler).toBeDefined();

    const request = {
      method: "elicitation/create",
      params: {
        message: "Please provide your name",
        requestedSchema: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      },
    } as unknown as ElicitRequest;

    const result = await handler?.(request);

    expect(result).toBeDefined();
    expect(result).toMatchObject({
      action: "accept",
      content: { name: "Test User", message: "Please provide your name" },
    });
  });

  it("testNullElicitationObjects", () => {
    expect(() => new McpElicitationProvider(null as never)).toThrow(
      "elicitationObjects can't be null!",
    );
  });

  it("testMultipleObjects", () => {
    const provider = new McpElicitationProvider([
      new TestElicitationHandler(),
      new TestElicitationHandler(),
    ]);

    expect(provider.getElicitationSpecifications()).toHaveLength(4);
  });

  it("testNonAnnotatedMethodsIgnored", () => {
    const provider = new McpElicitationProvider([new TestElicitationHandler()]);

    expect(provider.getElicitationSpecifications()).toHaveLength(2);
  });
});

class TestElicitationHandler {
  @McpElicitation({ clients: ["my-client-id"] })
  public handleElicitation(request: ElicitRequest): StructuredElicitResult<{
    name: string;
    message: string;
  }> {
    return new StructuredElicitResult({
      structuredContent: {
        name: "Test User",
        message: request.params.message,
      },
    });
  }

  @McpElicitation({ clients: ["test-client"] })
  public handleElicitationWithClientId(
    request: ElicitRequest,
  ): StructuredElicitResult<{
    name: string;
    message: string;
  }> {
    return new StructuredElicitResult({
      structuredContent: {
        name: "Test User",
        message: request.params.message,
      },
    });
  }

  public notAnnotatedMethod(_request: ElicitRequest): StructuredElicitResult<{
    name: string;
    message: string;
  }> {
    return new StructuredElicitResult({
      structuredContent: {
        name: "Ignored",
        message: "Ignored",
      },
    });
  }
}
