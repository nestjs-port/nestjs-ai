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
import { McpPrompt } from "@nestjs-ai/mcp-annotations";
import type { ProviderInstanceExplorer } from "@nestjs-port/core";

export const SERVER_INFO = {
  name: "nestjs-ai-mcp-server",
  version: "1.0.0",
} as const;

export const PROMPT_NAME = "greeting";
export const PROMPT_TEXT = "Hello from MCP";

@Injectable()
export class GreetingPromptProvider {
  @McpPrompt({
    name: PROMPT_NAME,
    description: "Return a greeting prompt",
  })
  greeting(): string {
    return PROMPT_TEXT;
  }
}

@Module({
  providers: [
    GreetingPromptProvider,
    {
      provide: PROVIDER_INSTANCE_EXPLORER_TOKEN,
      useFactory: (
        promptProvider: GreetingPromptProvider,
      ): ProviderInstanceExplorer => ({
        getProviderInstances: () => [promptProvider],
      }),
      inject: [GreetingPromptProvider],
    },
  ],
  exports: [PROVIDER_INSTANCE_EXPLORER_TOKEN],
})
export class PromptFixtureModule {}
