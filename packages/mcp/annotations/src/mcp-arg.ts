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
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import { MCP_ARG_METADATA_KEY } from "./metadata.js";

type StandardSchemaWithJsonSchema = StandardSchemaV1 & StandardJSONSchemaV1;

export interface McpArgMetadata {
  schema: StandardSchemaWithJsonSchema;
}

function assertJsonSchemaSupport(schema: StandardSchemaWithJsonSchema): void {
  const standard = schema["~standard"] as {
    jsonSchema?: { input?: (options?: { target?: string }) => unknown };
  };
  if (typeof standard?.jsonSchema?.input !== "function") {
    throw new Error(
      "@McpArg requires schema to expose ~standard.jsonSchema.input().",
    );
  }
}

/**
 * Marks a method parameter as an MCP argument using Standard Schema.
 */
export function McpArg(
  schema: StandardSchemaWithJsonSchema,
): ParameterDecorator {
  assertJsonSchemaSupport(schema);

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

    const metadata: McpArgMetadata = { schema };
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
