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

import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { PROVIDER_INSTANCE_EXPLORER_TOKEN } from "@nestjs-ai/commons";
import type { ProviderInstanceExplorer } from "@nestjs-port/core";
import {
  McpSamplingProvider,
  type SamplingSpecification,
} from "@nestjs-ai/mcp-annotations";

@Injectable()
export class McpClientSamplingScanner {
  private readonly logger = new Logger(McpClientSamplingScanner.name);

  constructor(
    @Inject(PROVIDER_INSTANCE_EXPLORER_TOKEN)
    @Optional()
    private readonly providerInstanceExplorer?: ProviderInstanceExplorer,
  ) {}

  discoverSamplingSpecifications(): SamplingSpecification[] {
    if (this.providerInstanceExplorer == null) {
      this.logger.warn(
        "ProviderInstanceExplorer is not available; MCP sampling methods were not discovered.",
      );
      return [];
    }

    const samplingObjects =
      this.providerInstanceExplorer.getProviderInstances();
    return new McpSamplingProvider({
      samplingObjects,
    }).getSamplingSpecifications();
  }
}
