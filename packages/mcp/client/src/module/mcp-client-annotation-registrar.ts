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

import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import type {
  Client as McpClient,
  CreateMessageRequest,
} from "@modelcontextprotocol/client";
import type {
  McpClientModuleOptions,
  McpClientRegistration,
} from "./mcp-client-module.options.js";
import { MCP_CLIENT_MODULE_OPTIONS_TOKEN } from "./mcp-client.tokens.js";
import { MCP_CLIENT_REGISTRATIONS_TOKEN } from "./mcp-client.tokens.js";
import type { McpClientSamplingScanner } from "./mcp-client-sampling-scanner.js";

@Injectable()
export class McpClientAnnotationRegistrar implements OnModuleInit {
  private readonly logger = new Logger(McpClientAnnotationRegistrar.name);

  private registered = false;

  constructor(
    @Inject(MCP_CLIENT_MODULE_OPTIONS_TOKEN)
    private readonly options: McpClientModuleOptions,
    @Inject(MCP_CLIENT_REGISTRATIONS_TOKEN)
    private readonly clientRegistrations: McpClientRegistration[],
    private readonly samplingScanner: McpClientSamplingScanner,
  ) {}

  onModuleInit(): void {
    if (this.registered) {
      return;
    }

    this.registerSampling();
    this.registered = true;
  }

  private registerSampling(): void {
    if (this.options.annotations?.sampling === false) {
      this.logger.debug("MCP sampling registration is disabled");
      return;
    }

    const samplingSpecifications =
      this.samplingScanner.discoverSamplingSpecifications();

    if (samplingSpecifications.length === 0) {
      this.logger.warn("No @McpSampling methods found");
      return;
    }

    if (this.clientRegistrations.length === 0) {
      this.logger.warn(
        "No MCP clients were provided; MCP sampling methods were not registered.",
      );
      return;
    }
    for (const registration of this.clientRegistrations) {
      this.registerSamplingForClient(
        registration.clientName,
        registration.mcpClient,
        samplingSpecifications,
      );
    }
  }

  private registerSamplingForClient(
    clientName: string,
    mcpClient: McpClient,
    samplingSpecifications: ReturnType<
      McpClientSamplingScanner["discoverSamplingSpecifications"]
    >,
  ): void {
    const matchingSpecifications = samplingSpecifications.filter((spec) =>
      spec.clients.includes(clientName),
    );

    if (matchingSpecifications.length === 0) {
      this.logger.debug(
        `No @McpSampling methods matched client "${clientName}"`,
      );
      return;
    }

    if (matchingSpecifications.length > 1) {
      throw new Error(
        `Multiple @McpSampling methods matched client "${clientName}". Only one sampling handler can be registered per MCP client.`,
      );
    }

    const [spec] = matchingSpecifications;
    if (spec == null) {
      return;
    }

    this.logger.debug(
      `Registering sampling handler for client "${clientName}"`,
    );
    mcpClient.setRequestHandler(
      "sampling/createMessage",
      async (request: CreateMessageRequest) => spec.samplingHandler(request),
    );
  }
}
