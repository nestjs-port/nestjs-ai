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

type JsonSchema = Record<string, unknown>;

const COMMON_PROPERTIES = [
  // Core schema properties
  "type",
  "format",
  "description",
  "default",
  "maximum",
  "minimum",
  "maxLength",
  "minLength",
  "pattern",
  "enum",
  "multipleOf",
  "uniqueItems",
  // OpenAPI specific properties
  "example",
  "deprecated",
  "readOnly",
  "writeOnly",
  "nullable",
  "discriminator",
  "xml",
  "externalDocs",
] as const;

const COMBINERS = ["allOf", "anyOf", "oneOf"] as const;

function copyCommonProperties(source: JsonSchema, target: JsonSchema): void {
  for (const prop of COMMON_PROPERTIES) {
    if (prop in source) {
      target[prop] = source[prop];
    }
  }
}

function handleJsonSchemaSpecifics(
  source: JsonSchema,
  target: JsonSchema,
): void {
  // Handle properties
  if (source.properties != null && typeof source.properties === "object") {
    const properties: JsonSchema = {};
    for (const [key, value] of Object.entries(
      source.properties as JsonSchema,
    )) {
      if (value != null && typeof value === "object" && !Array.isArray(value)) {
        properties[key] = convertSchema(value as JsonSchema);
      }
    }
    target.properties = properties;
  }

  // Handle required array
  if ("required" in source) {
    target.required = source.required;
  }

  // Handle additionalProperties
  if ("additionalProperties" in source) {
    const additionalProps = source.additionalProperties;
    if (typeof additionalProps === "boolean") {
      target.additionalProperties = additionalProps;
    } else if (
      additionalProps != null &&
      typeof additionalProps === "object" &&
      !Array.isArray(additionalProps)
    ) {
      target.additionalProperties = convertSchema(
        additionalProps as JsonSchema,
      );
    }
  }

  // Handle arrays
  if (
    source.items != null &&
    typeof source.items === "object" &&
    !Array.isArray(source.items)
  ) {
    target.items = convertSchema(source.items as JsonSchema);
  }

  // Handle allOf, anyOf, oneOf
  for (const combiner of COMBINERS) {
    if (combiner in source && Array.isArray(source[combiner])) {
      target[combiner] = [...(source[combiner] as unknown[])];
    }
  }
}

function convertSchema(source: JsonSchema): JsonSchema {
  const converted: JsonSchema = {};
  copyCommonProperties(source, converted);
  handleJsonSchemaSpecifics(source, converted);
  return converted;
}

export abstract class JsonSchemaConverter {
  static fromJson(jsonString: string): JsonSchema {
    try {
      const result = JSON.parse(jsonString);
      if (result == null || typeof result !== "object") {
        throw new TypeError("Parsed result is not an object");
      }
      return result as JsonSchema;
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${jsonString}`, { cause: e });
    }
  }

  static convertToOpenApiSchema(jsonSchemaNode: JsonSchema): JsonSchema {
    assert(jsonSchemaNode != null, "JSON Schema node must not be null");

    const openApiSchema = convertSchema(jsonSchemaNode);

    // Add OpenAPI-specific metadata
    if (!("openapi" in openApiSchema)) {
      openApiSchema.openapi = "3.0.0";
    }

    return openApiSchema;
  }
}
