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

import type {
  CompleteRequest,
  CompleteResult,
  McpServer,
  ServerContext,
} from "@modelcontextprotocol/server";

import { CompleteAdapter } from "../../adapter/index.js";
import { MCP_COMPLETE_METADATA_KEY } from "../../metadata.js";
import type { McpCompleteMetadata } from "../../mcp-complete.js";
import { McpCompleteMethodCallback } from "../../method/index.js";
import {
  discoverAnnotatedMethodKeys,
  getAnnotatedMethodMetadata,
} from "../annotation-provider-utils.js";
import type { CompleteRegistration } from "../../method/index.js";

export interface McpCompleteProviderProps {
  completeObjects: object[];
  mcpServer: McpServer;
}

type CompleteMethodRegistration = {
  reference: ReturnType<typeof CompleteAdapter.asCompleteReference>;
  callback: CompleteRegistration[1];
};

export class McpCompleteProvider {
  private readonly _completeObjects: readonly object[];

  private readonly _mcpServer: McpServer;

  constructor(props: McpCompleteProviderProps) {
    assert(props.completeObjects != null, "completeObjects can't be null!");
    assert(props.mcpServer != null, "mcpServer can't be null!");

    this._completeObjects = [...props.completeObjects];
    this._mcpServer = props.mcpServer;
  }

  getCompleteSpecifications(): Array<
    [
      string,
      (request: CompleteRequest, ctx: ServerContext) => Promise<CompleteResult>,
    ]
  > {
    const registrations = this.buildCompleteRegistrations();
    if (registrations.length === 0) {
      return [];
    }

    return [
      [
        "completion/complete",
        async (
          request: CompleteRequest,
          ctx: ServerContext,
        ): Promise<CompleteResult> => {
          const results = await Promise.all(
            registrations
              .filter(({ reference }) =>
                this.matchesReference(reference, request.params.ref),
              )
              .map(({ callback }) => callback(request, ctx)),
          );

          if (results.length === 0) {
            throw new Error(
              `No complete method found for ${this.describeReference(request.params.ref)}`,
            );
          }

          if (results.length === 1) {
            return results[0];
          }

          return this.mergeResults(results);
        },
      ],
    ];
  }

  private buildCompleteRegistrations(): CompleteMethodRegistration[] {
    return this._completeObjects.flatMap((completeObject) =>
      discoverAnnotatedMethodKeys(
        completeObject,
        MCP_COMPLETE_METADATA_KEY,
      ).map((propertyKey) => {
        const metadata = getAnnotatedMethodMetadata<McpCompleteMetadata>(
          completeObject,
          propertyKey,
          MCP_COMPLETE_METADATA_KEY,
        );
        if (metadata == null) {
          throw new Error(
            `@McpComplete metadata missing on ${String(propertyKey)}`,
          );
        }

        return {
          reference: CompleteAdapter.asCompleteReference(metadata),
          callback: new McpCompleteMethodCallback({
            provider: completeObject,
            propertyKey,
            complete: metadata,
            mcpServer: this._mcpServer,
          }).apply()[1],
        };
      }),
    );
  }

  private matchesReference(
    reference: ReturnType<typeof CompleteAdapter.asCompleteReference>,
    requestReference: CompleteRequest["params"]["ref"],
  ): boolean {
    const completeReference = reference as
      | { type: "ref/prompt"; name: string }
      | { type: "ref/resource"; uri: string };

    if (completeReference.type !== requestReference.type) {
      return false;
    }

    const ref = requestReference as
      | { type: "ref/prompt"; name: string }
      | { type: "ref/resource"; uri: string };

    if (completeReference.type === "ref/prompt") {
      return completeReference.name === (ref as { name: string }).name;
    }

    return completeReference.uri === (ref as { uri: string }).uri;
  }

  private mergeResults(results: CompleteResult[]): CompleteResult {
    const values = Array.from(
      new Set(results.flatMap((result) => result.completion.values)),
    );

    return {
      completion: {
        values,
        total: values.length,
        hasMore: results.some((result) => result.completion.hasMore),
      },
    };
  }

  private describeReference(
    requestReference: CompleteRequest["params"]["ref"],
  ): string {
    const ref = requestReference as
      | { type: "ref/prompt"; name: string }
      | { type: "ref/resource"; uri: string };
    const completeReference = ref as
      | { type: "ref/prompt"; name: string }
      | { type: "ref/resource"; uri: string };

    if (completeReference.type === "ref/prompt") {
      return `prompt ${(completeReference as { name: string }).name}`;
    }

    return `resource ${(completeReference as { uri: string }).uri}`;
  }
}
