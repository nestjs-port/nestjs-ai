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

import type { ElicitRequest, ElicitResult } from "@modelcontextprotocol/server";

import { MCP_ELICITATION_METADATA_KEY } from "../../metadata.js";
import { McpElicitationMethodCallback } from "../../method/index.js";
import { ElicitationSpecification } from "../../method/index.js";
import type { McpElicitationMetadata } from "../../mcp-elicitation.js";
import {
  discoverAnnotatedMethodKeys,
  getAnnotatedMethodMetadata,
} from "../annotation-provider-utils.js";

export interface McpElicitationProviderProps {
  elicitationObjects: object[];
}

export class McpElicitationProvider {
  private readonly _elicitationObjects: readonly object[];

  constructor(props: McpElicitationProviderProps) {
    assert(
      props.elicitationObjects != null,
      "elicitationObjects can't be null!",
    );
    this._elicitationObjects = [...props.elicitationObjects];
  }

  getElicitationSpecifications(): ElicitationSpecification[] {
    return this._elicitationObjects.flatMap((elicitationObject) =>
      discoverAnnotatedMethodKeys(
        elicitationObject,
        MCP_ELICITATION_METADATA_KEY,
      ).map((propertyKey) => {
        const metadata = getAnnotatedMethodMetadata<McpElicitationMetadata>(
          elicitationObject,
          propertyKey,
          MCP_ELICITATION_METADATA_KEY,
        );
        if (metadata == null) {
          throw new Error(
            `@McpElicitation metadata missing on ${String(propertyKey)}`,
          );
        }

        const callback = new McpElicitationMethodCallback({
          provider: elicitationObject,
          propertyKey,
        });

        return new ElicitationSpecification({
          clients: [...metadata.clients],
          elicitationHandler: (request: ElicitRequest): Promise<ElicitResult> =>
            callback.apply(request),
        });
      }),
    );
  }
}
