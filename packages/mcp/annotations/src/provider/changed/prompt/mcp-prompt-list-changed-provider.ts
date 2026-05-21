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

import assert from "node:assert/strict";

import type { Prompt } from "@modelcontextprotocol/server";

import { MCP_PROMPT_LIST_CHANGED_METADATA_KEY } from "../../../metadata.js";
import { McpPromptListChangedMethodCallback } from "../../../method/changed/prompt/mcp-prompt-list-changed-method-callback.js";
import { PromptListChangedSpecification } from "../../../method/changed/prompt/prompt-list-changed-specification.js";
import type { McpPromptListChangedMetadata } from "../../../mcp-prompt-list-changed.js";
import {
  discoverAnnotatedMethodKeys,
  getAnnotatedMethodMetadata,
} from "../../annotation-provider-utils.js";

export class McpPromptListChangedProvider {
  private readonly _promptListChangedObjects: readonly object[];

  constructor(promptListChangedObjects: object[]) {
    assert(
      promptListChangedObjects != null,
      "promptListChangedObjects can't be null!",
    );
    this._promptListChangedObjects = [...promptListChangedObjects];
  }

  getPromptListChangedSpecifications(): PromptListChangedSpecification[] {
    return this._promptListChangedObjects.flatMap((promptListChangedObject) =>
      discoverAnnotatedMethodKeys(
        promptListChangedObject,
        MCP_PROMPT_LIST_CHANGED_METADATA_KEY,
      ).map((propertyKey) => {
        const metadata =
          getAnnotatedMethodMetadata<McpPromptListChangedMetadata>(
            promptListChangedObject,
            propertyKey,
            MCP_PROMPT_LIST_CHANGED_METADATA_KEY,
          );
        if (metadata == null) {
          throw new Error(
            `@McpPromptListChanged metadata missing on ${String(propertyKey)}`,
          );
        }

        const callback = new McpPromptListChangedMethodCallback({
          provider: promptListChangedObject,
          propertyKey,
        });

        return new PromptListChangedSpecification({
          clients: [...metadata.clients],
          promptListChangeHandler: async (
            error: Error | null,
            updatedPrompts: Prompt[] | null,
          ): Promise<void> => {
            if (error != null) {
              throw error;
            }
            if (updatedPrompts == null) {
              throw new TypeError("Updated prompts list must not be null");
            }

            await callback.apply(updatedPrompts);
          },
        });
      }),
    );
  }
}
