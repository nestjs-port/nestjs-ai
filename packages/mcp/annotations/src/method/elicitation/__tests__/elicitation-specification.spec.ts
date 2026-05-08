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

import type { ElicitResult } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";

import { ElicitationTestHelper } from "./elicitation-test-helper.js";
import { ElicitationSpecification } from "../elicitation-specification.js";

describe("ElicitationSpecification", () => {
  it("test valid client id", () => {
    const spec = new ElicitationSpecification({
      clients: ["valid-client-id"],
      elicitationHandler: (_request) =>
        Promise.resolve({
          action: "accept",
          content: { test: "value" },
        } as ElicitResult),
    });

    expect(spec.clients).toEqual(["valid-client-id"]);
    expect(spec.elicitationHandler).toBeDefined();
  });

  it("test null client id", () => {
    expect(() => {
      new ElicitationSpecification({
        clients: null as unknown as string[],
        elicitationHandler: (_request) =>
          Promise.resolve({
            action: "accept",
            content: { test: "value" },
          } as ElicitResult),
      });
    }).toThrow("clients must not be null");
  });

  it("test empty client id", () => {
    expect(() => {
      new ElicitationSpecification({
        clients: [""],
        elicitationHandler: (_request) =>
          Promise.resolve({
            action: "accept",
            content: { test: "value" },
          } as ElicitResult),
      });
    }).toThrow("clients must not be empty");
  });

  it("test blank client id", () => {
    expect(() => {
      new ElicitationSpecification({
        clients: ["\t "],
        elicitationHandler: (_request) =>
          Promise.resolve({
            action: "accept",
            content: { test: "value" },
          } as ElicitResult),
      });
    }).toThrow("clients must not be empty");
  });

  it("test null handler", () => {
    expect(() => {
      new ElicitationSpecification({
        clients: ["valid-client-id"],
        elicitationHandler: null as unknown as (
          request: Parameters<
            ElicitationSpecification["elicitationHandler"]
          >[0],
        ) => Promise<ElicitResult>,
      });
    }).toThrow("elicitationHandler must not be null");
  });

  it("test functionality", async () => {
    const spec = new ElicitationSpecification({
      clients: ["test-client"],
      elicitationHandler: async (request) =>
        ({
          action: "accept",
          content: {
            message: request.params.message,
            clientId: "test-client",
          },
        }) as ElicitResult,
    });

    const request =
      ElicitationTestHelper.createSampleRequest("Test async message");
    const result = await spec.elicitationHandler(request);

    expect(result).toBeDefined();
    expect(result.action).toBe("accept");
    expect(result.content).toMatchObject({
      message: "Test async message",
      clientId: "test-client",
    });
  });
});
