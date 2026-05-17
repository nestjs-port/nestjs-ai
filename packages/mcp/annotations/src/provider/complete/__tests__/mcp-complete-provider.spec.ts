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
  CompleteRequest,
  CompleteResult,
  McpServer,
} from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import { McpComplete } from "../../../mcp-complete.js";
import type { McpCompleteMethodArguments } from "../../../mcp-complete.js";
import { McpCompleteProvider } from "../index.js";

describe("McpCompleteProvider", () => {
  describe("getCompleteSpecifications()", () => {
    it("produces a single low-level completion registration", () => {
      const provider = new McpCompleteProvider({
        completeObjects: [new ExampleCompleteProvider()],
        mcpServer: createMockServer(),
      });

      const specifications = provider.getCompleteSpecifications();
      const refs = specifications.map(([method]) => method);

      expect(refs).toEqual(["completion/complete"]);
    });

    it("returns callbacks that execute the matching user method", async () => {
      const provider = new McpCompleteProvider({
        completeObjects: [new ExampleCompleteProvider()],
        mcpServer: createMockServer(),
      });

      const specifications = provider.getCompleteSpecifications();
      const entry = specifications[0];
      expect(entry).toBeDefined();

      const [, completeHandler] = entry!;
      const promptResult = await completeHandler(
        createRequest({
          type: "ref/prompt",
          name: "alpha-prompt",
        }),
        createMockCtx(),
      );

      expect(promptResult.completion.values).toEqual([
        "alpha-complete-one",
        "alpha-complete-two",
      ]);
      expect(promptResult.completion.total).toBe(2);
      expect(promptResult.completion.hasMore).toBe(false);

      const resourceResult = await completeHandler(
        createRequest({
          type: "ref/resource",
          uri: "resource://{name}",
        }),
        createMockCtx(),
      );

      expect(resourceResult.completion.values).toEqual(["beta-complete"]);
    });

    it("returns an empty array when no complete methods are present", () => {
      class EmptyProvider {
        plain(): string {
          return "no completions";
        }
      }

      const provider = new McpCompleteProvider({
        completeObjects: [new EmptyProvider()],
        mcpServer: createMockServer(),
      });

      expect(provider.getCompleteSpecifications()).toEqual([]);
    });
  });

  describe("constructor", () => {
    it("rejects null completeObjects", () => {
      expect(
        () =>
          new McpCompleteProvider({
            completeObjects: null as never,
            mcpServer: createMockServer(),
          }),
      ).toThrow("completeObjects can't be null!");
    });

    it("rejects null mcpServer", () => {
      expect(
        () =>
          new McpCompleteProvider({
            completeObjects: [],
            mcpServer: null as never,
          }),
      ).toThrow("mcpServer can't be null!");
    });
  });
});

class ExampleCompleteProvider {
  @McpComplete({ prompt: "alpha-prompt" })
  alphaComplete(args: McpCompleteMethodArguments): string[] {
    void args;
    return ["alpha-complete-one", "alpha-complete-two"];
  }

  @McpComplete({ uri: "resource://{name}" })
  betaComplete(args: McpCompleteMethodArguments): CompleteResult {
    void args;
    return {
      completion: {
        values: ["beta-complete"],
        total: 1,
        hasMore: false,
      },
    };
  }
}

function createRequest(ref: CompleteRequest["params"]["ref"]): CompleteRequest {
  return {
    method: "completion/complete",
    params: {
      ref,
      argument: {
        name: "value",
        value: "al",
      },
    },
  } as CompleteRequest;
}

function createMockCtx() {
  return {
    sessionId: "session-1",
    mcpReq: {
      _meta: undefined,
      signal: new AbortController().signal,
      notify: () => Promise.resolve(),
    },
  } as never;
}

function createMockServer(): McpServer {
  return {
    server: {
      getClientCapabilities: () => undefined,
      getClientVersion: () => undefined,
      listRoots: () => Promise.reject(new Error("listRoots not mocked")),
      elicitInput: () => Promise.reject(new Error("elicitInput not mocked")),
      createMessage: () =>
        Promise.reject(new Error("createMessage not mocked")),
      sendLoggingMessage: () => Promise.resolve(),
      ping: () => Promise.resolve(),
    },
    registerPrompt: () => undefined,
    registerResource: () => undefined,
    registerTool: () => undefined,
  } as unknown as McpServer;
}
