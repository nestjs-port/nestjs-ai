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

import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";

type StandardSchemaWithJsonSchema = StandardSchemaV1 & StandardJSONSchemaV1;

export enum SchemaOption {
  ALLOW_ADDITIONAL_PROPERTIES_BY_DEFAULT = "ALLOW_ADDITIONAL_PROPERTIES_BY_DEFAULT",
  UPPER_CASE_TYPE_VALUES = "UPPER_CASE_TYPE_VALUES",
}

export abstract class JsonSchemaGenerator {
  static generateForMethodInput(
    parameters: StandardSchemaWithJsonSchema | null | undefined,
    ...schemaOptions: SchemaOption[]
  ): string {
    if (!parameters) {
      return "{}";
    }

    try {
      const jsonSchema = parameters["~standard"].jsonSchema.input({
        target: "draft-2020-12",
      });
      JsonSchemaGenerator.removeFormatFromDirectObjectProperties(jsonSchema);
      JsonSchemaGenerator.processSchemaOptions(schemaOptions, jsonSchema);
      return JSON.stringify(jsonSchema, null, 2);
    } catch {
      return "{}";
    }
  }

  static convertTypeValuesToUpperCase(node: Record<string, unknown>): void {
    if (Array.isArray(node)) {
      for (const element of node) {
        if (element != null && typeof element === "object") {
          JsonSchemaGenerator.convertTypeValuesToUpperCase(
            element as Record<string, unknown>,
          );
        }
      }
    } else if (typeof node === "object" && node != null) {
      for (const [key, value] of Object.entries(node)) {
        if (
          value != null &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          JsonSchemaGenerator.convertTypeValuesToUpperCase(
            value as Record<string, unknown>,
          );
        } else if (Array.isArray(value)) {
          for (const element of value) {
            if (element != null && typeof element === "object") {
              JsonSchemaGenerator.convertTypeValuesToUpperCase(
                element as Record<string, unknown>,
              );
            }
          }
        } else if (typeof value === "string" && key === "type") {
          node[key] = value.toUpperCase() as typeof node.type;
        }
      }
    }
  }

  private static processSchemaOptions(
    schemaOptions: SchemaOption[],
    schema: Record<string, unknown>,
  ): void {
    const allowAdditionalProperties = schemaOptions.includes(
      SchemaOption.ALLOW_ADDITIONAL_PROPERTIES_BY_DEFAULT,
    );
    if (schema.type === "object") {
      if (!allowAdditionalProperties) {
        schema.additionalProperties = false;
      } else if (schema.additionalProperties === false) {
        delete schema.additionalProperties;
      }
    }
    if (schemaOptions.includes(SchemaOption.UPPER_CASE_TYPE_VALUES)) {
      JsonSchemaGenerator.convertTypeValuesToUpperCase(schema);
    }
  }

  private static removeFormatFromDirectObjectProperties(
    schema: Record<string, unknown>,
  ): void {
    if (schema.type !== "object" || !schema.properties) {
      return;
    }

    const properties = schema.properties as Record<
      string,
      Record<string, unknown>
    >;
    for (const propertySchema of Object.values(properties)) {
      if (
        propertySchema &&
        typeof propertySchema === "object" &&
        "format" in propertySchema
      ) {
        delete propertySchema.format;
      }
    }
  }
}
