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
import { MCP_ARG_METADATA_KEY } from "./metadata.js";

export interface McpArgMetadata {
  name: string;
  description: string;
  required: boolean;
}

export interface McpArgOptions {
  name: string;
  description?: string;
  required?: boolean;
}

/**
 * Marks a method parameter as an MCP Argument.
 */
export function McpArg(options: McpArgOptions): ParameterDecorator {
  if (options.name == null || options.name.trim().length === 0) {
    throw new Error("@McpArg requires a non-empty name.");
  }

  return (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    const existing = (
      propertyKey === undefined
        ? Reflect.getMetadata(MCP_ARG_METADATA_KEY, target)
        : Reflect.getMetadata(MCP_ARG_METADATA_KEY, target, propertyKey)
    ) as Record<number, McpArgMetadata> | undefined;

    const metadata: McpArgMetadata = {
      name: options.name,
      description: options.description ?? "",
      required: options.required ?? false,
    };
    const nextMetadata = existing
      ? { ...existing, [parameterIndex]: metadata }
      : { [parameterIndex]: metadata };

    if (propertyKey === undefined) {
      Reflect.defineMetadata(MCP_ARG_METADATA_KEY, nextMetadata, target);
      return;
    }

    Reflect.defineMetadata(
      MCP_ARG_METADATA_KEY,
      nextMetadata,
      target,
      propertyKey,
    );
  };
}
