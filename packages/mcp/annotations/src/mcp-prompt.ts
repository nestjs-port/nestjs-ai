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
import { DefaultMetaProvider } from "./context/index.js";
import type { MetaProvider } from "./context/index.js";
import { MCP_PROMPT_METADATA_KEY } from "./metadata.js";

export interface McpPromptOptions {
  /**
   * Unique identifier for the prompt
   */
  name?: string;

  /**
   * Optional human-readable name of the prompt for display purposes.
   */
  title?: string;

  /**
   * Optional human-readable description.
   */
  description?: string;

  /**
   * Optional meta provider class that implements the MetaProvider interface. Used to
   * provide additional metadata for the prompt. Defaults to {@link DefaultMetaProvider}
   * if not specified.
   */
  metaProvider?: new () => MetaProvider;
}

export interface McpPromptMetadata {
  name: string;
  title: string;
  description: string;
  metaProvider: new () => MetaProvider;
}

/**
 * Marks a method as a MCP Prompt.
 */
export function McpPrompt(options: McpPromptOptions = {}): MethodDecorator {
  const metadata: McpPromptMetadata = {
    name: options.name ?? "",
    title: options.title ?? "",
    description: options.description ?? "",
    metaProvider: options.metaProvider ?? DefaultMetaProvider,
  };

  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor,
  ): void => {
    Reflect.defineMetadata(
      MCP_PROMPT_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );
  };
}
