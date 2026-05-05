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
import assert from "node:assert/strict";

import type { McpServer } from "@modelcontextprotocol/server";

import {
  McpPromptMethodCallback,
  type PromptRegistration,
} from "../../method/index.js";
import type { McpPromptMetadata } from "../../mcp-prompt.js";
import { MCP_PROMPT_METADATA_KEY } from "../../metadata.js";

export interface McpPromptProviderProps {
  promptObjects: object[];
  mcpServer: McpServer;
}

/**
 * Discovers `@McpPrompt`-annotated methods on a list of bean objects and
 * produces {@link PromptRegistration} tuples ready to spread into
 * {@link McpServer.registerPrompt}.
 */
export class McpPromptProvider {
  private readonly _promptObjects: readonly object[];

  private readonly _mcpServer: McpServer;

  constructor(props: McpPromptProviderProps) {
    assert(props.promptObjects != null, "promptObjects can't be null!");
    assert(props.mcpServer != null, "mcpServer can't be null!");

    this._promptObjects = [...props.promptObjects];
    this._mcpServer = props.mcpServer;
  }

  /**
   * Build the registration tuple for each `@McpPrompt`-decorated method on
   * every supplied bean. Tuples are sorted by prompt name for deterministic
   * output across runs.
   */
  getPromptRegistrations(): PromptRegistration[] {
    return this._promptObjects.flatMap((promptObject) =>
      this.discoverPromptMethods(promptObject).map((propertyKey) => {
        const metadata = this.getPromptMetadata(promptObject, propertyKey);
        if (metadata == null) {
          throw new Error(
            `@McpPrompt metadata missing on ${String(propertyKey)}`,
          );
        }
        const callback = new McpPromptMethodCallback({
          provider: promptObject,
          propertyKey,
          metadata,
          mcpServer: this._mcpServer,
        });
        return callback.apply();
      }),
    );
  }

  /**
   * Convenience method that registers every discovered prompt against the
   * configured `McpServer`. Equivalent to spreading each tuple into
   * `mcpServer.registerPrompt(...)` manually.
   */
  private discoverPromptMethods(bean: object): (string | symbol)[] {
    const prototype = Object.getPrototypeOf(bean) as object;
    return Object.getOwnPropertyNames(prototype)
      .filter((name) => name !== "constructor")
      .filter(
        (name) => typeof (bean as Record<string, unknown>)[name] === "function",
      )
      .filter((name) => this.getPromptMetadata(bean, name) != null)
      .sort((a, b) => a.localeCompare(b));
  }

  private getPromptMetadata(
    bean: object,
    propertyKey: string | symbol,
  ): McpPromptMetadata | null {
    return (
      (Reflect.getMetadata(
        MCP_PROMPT_METADATA_KEY,
        Object.getPrototypeOf(bean),
        propertyKey,
      ) as McpPromptMetadata | undefined) ?? null
    );
  }
}
