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
import { McpSamplingMethodCallback } from "../../method/sampling/mcp-sampling-method-callback.js";
import type { SamplingSpecification } from "../../method/sampling/sampling-specification.js";
import type { McpSamplingMetadata } from "../../mcp-sampling.js";
import { MCP_SAMPLING_METADATA_KEY } from "../../metadata.js";
import {
  discoverAnnotatedMethodKeys,
  getAnnotatedMethodMetadata,
} from "../annotation-provider-utils.js";

/**
 * Discovers `@McpSampling`-annotated methods on a list of objects and produces
 * {@link SamplingSpecification} entries for them.
 */
export class McpSamplingProvider {
  private readonly _samplingObjects: readonly object[];

  constructor(samplingObjects: object[]) {
    assert(samplingObjects != null, "samplingObjects can't be null!");

    this._samplingObjects = [...samplingObjects];
  }

  /**
   * Build the specification entry for each `@McpSampling`-decorated method on
   * every supplied object. Entries are sorted by method name for deterministic
   * output across runs.
   */
  getSamplingSpecifications(): SamplingSpecification[] {
    return this._samplingObjects.flatMap((samplingObject) =>
      discoverAnnotatedMethodKeys(
        samplingObject,
        MCP_SAMPLING_METADATA_KEY,
      ).map((propertyKey) => {
        const metadata = getAnnotatedMethodMetadata<McpSamplingMetadata>(
          samplingObject,
          propertyKey,
          MCP_SAMPLING_METADATA_KEY,
        );
        if (metadata == null) {
          throw new Error(
            `@McpSampling metadata missing on ${String(propertyKey)}`,
          );
        }

        const callback = new McpSamplingMethodCallback({
          provider: samplingObject,
          propertyKey,
        });

        return {
          clients: [...metadata.clients],
          samplingHandler: (request) => callback.apply(request),
        } satisfies SamplingSpecification;
      }),
    );
  }
}
