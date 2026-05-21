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

import { fileURLToPath } from "node:url";

import { describe, it } from "vitest";
import {
  assertGreetingPrompt,
  bootstrapStdioClient,
} from "./support/mcp-server-client.js";

describe("McpServerModule", () => {
  it("exposes prompts through the stdio client transport", async () => {
    const fixtureUrl = fileURLToPath(
      new URL("./fixtures/stdio-prompt-server.fixture.ts", import.meta.url),
    );
    const { client, transport } = await bootstrapStdioClient(fixtureUrl);

    try {
      await assertGreetingPrompt(client);
    } finally {
      await client.close().catch(() => undefined);
      await transport.close().catch(() => undefined);
    }
  }, 30_000);
});
