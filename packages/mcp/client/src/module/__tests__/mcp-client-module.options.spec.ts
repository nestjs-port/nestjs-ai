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

import { Client } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";

import { normalizeMcpClientRegistrations } from "../mcp-client-module.options.js";

describe("normalizeMcpClientRegistrations", () => {
  it("creates client registrations from SDK client creation options", () => {
    const registrations = normalizeMcpClientRegistrations({
      clients: [
        {
          clientInfo: {
            name: "sample-client",
            version: "1.0.0",
          },
        },
      ],
    });

    expect(registrations).toHaveLength(1);
    expect(registrations[0]?.clientName).toBe("sample-client");
    expect(registrations[0]?.mcpClient).toBeInstanceOf(Client);
  });

  it("throws when no clients are configured", () => {
    expect(() =>
      normalizeMcpClientRegistrations({
        clients: [],
      }),
    ).toThrowError("clients must not be empty");
  });

  it("throws when clientInfo.name is empty", () => {
    expect(() =>
      normalizeMcpClientRegistrations({
        clients: [
          {
            clientInfo: {
              name: "   ",
              version: "1.0.0",
            },
          },
        ],
      }),
    ).toThrowError("clientInfo.name must not be empty");
  });
});
