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
import { MCP_TOOL_PARAM_METADATA_KEY } from "./metadata.js";

type StandardSchemaWithJsonSchema = StandardSchemaV1 & StandardJSONSchemaV1;

export interface McpToolParamMetadata {
  schema: StandardSchemaWithJsonSchema;
}

function assertJsonSchemaSupport(schema: StandardSchemaWithJsonSchema): void {
  const standard = schema["~standard"] as {
    jsonSchema?: { input?: (options?: { target?: string }) => unknown };
  };
  if (typeof standard?.jsonSchema?.input !== "function") {
    throw new Error(
      "@McpToolParam requires schema to expose ~standard.jsonSchema.input().",
    );
  }
}

export function McpToolParam(
  schema: StandardSchemaWithJsonSchema,
): ParameterDecorator;
export function McpToolParam(
  schema: StandardSchemaWithJsonSchema,
): PropertyDecorator;
export function McpToolParam(
  schema: StandardSchemaWithJsonSchema,
): ParameterDecorator & PropertyDecorator {
  assertJsonSchemaSupport(schema);
  const metadata: McpToolParamMetadata = { schema };

  const decorator = (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndexOrPropertyDescriptor?: number | PropertyDescriptor,
  ): void => {
    if (typeof parameterIndexOrPropertyDescriptor === "number") {
      const existing = (
        propertyKey === undefined
          ? Reflect.getMetadata(MCP_TOOL_PARAM_METADATA_KEY, target)
          : Reflect.getMetadata(
              MCP_TOOL_PARAM_METADATA_KEY,
              target,
              propertyKey,
            )
      ) as Record<number, McpToolParamMetadata> | undefined;
      const nextMetadata = existing
        ? { ...existing, [parameterIndexOrPropertyDescriptor]: metadata }
        : { [parameterIndexOrPropertyDescriptor]: metadata };

      if (propertyKey === undefined) {
        Reflect.defineMetadata(
          MCP_TOOL_PARAM_METADATA_KEY,
          nextMetadata,
          target,
        );
        return;
      }

      Reflect.defineMetadata(
        MCP_TOOL_PARAM_METADATA_KEY,
        nextMetadata,
        target,
        propertyKey,
      );
      return;
    }

    if (propertyKey === undefined) {
      Reflect.defineMetadata(MCP_TOOL_PARAM_METADATA_KEY, metadata, target);
      return;
    }

    Reflect.defineMetadata(
      MCP_TOOL_PARAM_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );
  };

  return decorator as ParameterDecorator & PropertyDecorator;
}
