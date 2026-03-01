import { z } from "zod";
import { ToolContextSchema } from "../../../chat";

type JsonSchemaNode = z.core.ZodStandardJSONSchemaPayload<z.ZodTypeAny>;

export enum SchemaOption {
  ALLOW_ADDITIONAL_PROPERTIES_BY_DEFAULT = "ALLOW_ADDITIONAL_PROPERTIES_BY_DEFAULT",
  UPPER_CASE_TYPE_VALUES = "UPPER_CASE_TYPE_VALUES",
}

export class JsonSchemaGenerator {
  private constructor() {
    // Prevent instantiation
  }

  static generateForMethodInput(
    parameters: z.ZodTypeAny | undefined,
    ...schemaOptions: SchemaOption[]
  ): string {
    if (!parameters || parameters === ToolContextSchema) {
      return "{}";
    }

    const tupleItems = JsonSchemaGenerator.getTupleItems(parameters);
    if (tupleItems) {
      return JsonSchemaGenerator.generateObjectSchemaForTupleInput(
        tupleItems,
        schemaOptions,
      );
    }

    try {
      const jsonSchema: JsonSchemaNode = z.toJSONSchema(parameters, {
        unrepresentable: "any",
      });
      JsonSchemaGenerator.removeFormatFromDirectObjectProperties(jsonSchema);
      JsonSchemaGenerator.processSchemaOptions(schemaOptions, jsonSchema);
      return JSON.stringify(jsonSchema, null, 2);
    } catch {
      return "{}";
    }
  }

  static convertTypeValuesToUpperCase(node: JsonSchemaNode): void {
    if (Array.isArray(node)) {
      for (const element of node) {
        if (element != null && typeof element === "object") {
          JsonSchemaGenerator.convertTypeValuesToUpperCase(
            element as JsonSchemaNode,
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
            value as JsonSchemaNode,
          );
        } else if (Array.isArray(value)) {
          for (const element of value) {
            if (element != null && typeof element === "object") {
              JsonSchemaGenerator.convertTypeValuesToUpperCase(
                element as JsonSchemaNode,
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
    schema: JsonSchemaNode,
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

  private static generateObjectSchemaForTupleInput(
    tupleItems: z.ZodTypeAny[],
    schemaOptions: SchemaOption[],
  ): string {
    const nonContextItems = tupleItems.filter(
      (item) => item !== ToolContextSchema,
    );
    if (nonContextItems.length === 0) {
      return "{}";
    }

    try {
      const properties: Record<string, JsonSchemaNode> = {};
      const required: string[] = [];
      nonContextItems.forEach((item, index) => {
        const argName = `arg${index}`;
        const itemSchema = z.toJSONSchema(item, {
          unrepresentable: "any",
        }) as JsonSchemaNode;
        if ("format" in itemSchema) {
          delete itemSchema.format;
        }
        properties[argName] = itemSchema;
        required.push(argName);
      });

      const jsonSchema = {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties,
        required,
      } as unknown as JsonSchemaNode;

      JsonSchemaGenerator.processSchemaOptions(schemaOptions, jsonSchema);
      return JSON.stringify(jsonSchema, null, 2);
    } catch {
      return "{}";
    }
  }

  private static removeFormatFromDirectObjectProperties(
    schema: JsonSchemaNode,
  ): void {
    if (schema.type !== "object" || !schema.properties) {
      return;
    }

    const properties = schema.properties as Record<string, JsonSchemaNode>;
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

  private static getTupleItems(schema: z.ZodTypeAny): z.ZodTypeAny[] | null {
    const def = (
      schema as { _zod?: { def?: { type?: unknown; items?: unknown } } }
    )._zod?.def;
    if (def?.type !== "tuple" || !Array.isArray(def.items)) {
      return null;
    }
    return def.items as z.ZodTypeAny[];
  }
}
