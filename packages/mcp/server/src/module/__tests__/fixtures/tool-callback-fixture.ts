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

import { Injectable, Module } from "@nestjs/common";
import { PROVIDER_INSTANCE_EXPLORER_TOKEN } from "@nestjs-ai/commons";
import { ToolCallback, type ToolCallbackProvider } from "@nestjs-ai/model";
import type { ProviderInstanceExplorer } from "@nestjs-port/core";

export const SERVER_INFO = {
  name: "nestjs-ai-mcp-tool-server",
  version: "1.0.0",
} as const;

export const TOOL_NAME = "echo";
export const TOOL_DESCRIPTION = "Echo the provided tool input";

class EchoToolCallback extends ToolCallback {
  override get toolDefinition() {
    return {
      name: TOOL_NAME,
      description: TOOL_DESCRIPTION,
      inputSchema:
        '{"type":"object","properties":{"value":{"type":"string"}},"required":["value"]}',
    };
  }
}

@Injectable()
export class EchoToolProvider implements ToolCallbackProvider {
  private readonly _toolCallbacks = [new EchoToolCallback()];

  get toolCallbacks(): ToolCallback[] {
    return this._toolCallbacks;
  }
}

@Module({
  providers: [
    EchoToolProvider,
    {
      provide: PROVIDER_INSTANCE_EXPLORER_TOKEN,
      useFactory: (
        echoToolProvider: EchoToolProvider,
      ): ProviderInstanceExplorer => ({
        getProviderInstances: () => [echoToolProvider],
      }),
      inject: [EchoToolProvider],
    },
  ],
  exports: [PROVIDER_INSTANCE_EXPLORER_TOKEN],
})
export class ToolCallbackFixtureModule {}
