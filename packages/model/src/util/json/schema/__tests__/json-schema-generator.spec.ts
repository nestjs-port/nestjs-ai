import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolContextSchema } from "../../../../chat";
import { JsonSchemaGenerator, SchemaOption } from "../json-schema-generator";

type JsonSchemaNodeArg = Parameters<
  typeof JsonSchemaGenerator.convertTypeValuesToUpperCase
>[0];

function asJsonSchemaNode<T>(value: T): JsonSchemaNodeArg {
  return value as JsonSchemaNodeArg;
}

describe("JsonSchemaGenerator", () => {
  describe("generateForMethodInput", () => {
    it("generates schema for method with simple parameters", () => {
      const schema = JsonSchemaGenerator.generateForMethodInput(
        z.tuple([z.string(), z.int()]),
      );

      expect(schema).toMatchInlineSnapshot(`
        "{
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "arg0": {
              "$schema": "https://json-schema.org/draft/2020-12/schema",
              "type": "string"
            },
            "arg1": {
              "$schema": "https://json-schema.org/draft/2020-12/schema",
              "type": "integer",
              "minimum": -9007199254740991,
              "maximum": 9007199254740991
            }
          },
          "required": [
            "arg0",
            "arg1"
          ],
          "additionalProperties": false
        }"
      `);
    });

    it("generates schema for method with descriptions and optional fields", () => {
      const schema = JSON.parse(
        JsonSchemaGenerator.generateForMethodInput(
          z.object({
            username: z
              .string()
              .describe("The username of the customer")
              .optional(),
            password: z.string(),
          }),
        ),
      ) as {
        properties?: Record<string, { description?: string; type?: string }>;
        required?: string[];
      };

      expect(schema.properties?.username?.type).toBe("string");
      expect(schema.properties?.username?.description).toBe(
        "The username of the customer",
      );
      expect(schema.properties?.password?.type).toBe("string");
      expect(schema.required).toEqual(["password"]);
    });

    it("generates schema for method when parameters are required by default", () => {
      const schema = JSON.parse(
        JsonSchemaGenerator.generateForMethodInput(
          z.object({
            username: z.string(),
            password: z.string(),
          }),
        ),
      ) as { required?: string[] };

      expect(schema.required).toEqual(["username", "password"]);
    });

    it("generates schema for method with object parameter", () => {
      const schema = JSON.parse(
        JsonSchemaGenerator.generateForMethodInput(
          z.object({
            object: z.unknown(),
          }),
        ),
      ) as {
        properties?: Record<string, Record<string, unknown>>;
        required?: string[];
      };

      expect(schema.properties?.object).toEqual({});
      expect(schema.required).toEqual(["object"]);
    });

    it("generates schema for method with nullable-like parameter", () => {
      const schema = JSON.parse(
        JsonSchemaGenerator.generateForMethodInput(
          z.object({
            username: z.string().nullable().optional(),
            password: z.string(),
          }),
        ),
      ) as { required?: string[] };

      expect(schema.required).toEqual(["password"]);
    });

    it("generates schema for method with complex parameters", () => {
      const schema = JSON.parse(
        JsonSchemaGenerator.generateForMethodInput(
          z.object({
            items: z.array(z.string()),
            data: z.object({
              id: z.int(),
              name: z.string().describe("The special name"),
            }),
            moreData: z
              .object({
                id: z.int(),
                name: z.string().describe("Even more special name"),
              })
              .describe("Much more data"),
          }),
        ),
      ) as {
        properties?: Record<string, Record<string, unknown>>;
        required?: string[];
      };

      expect(schema.required).toEqual(["items", "data", "moreData"]);
      expect(schema.properties?.items?.type).toBe("array");
      expect(schema.properties?.data?.type).toBe("object");
      expect(schema.properties?.moreData?.description).toBe("Much more data");
    });

    it("generates schema for method with time parameters", () => {
      const schema = JSON.parse(
        JsonSchemaGenerator.generateForMethodInput(
          z.object({
            duration: z.string(),
            localDateTime: z.string(),
            instant: z.string(),
          }),
        ),
      ) as {
        properties?: Record<string, { type?: string }>;
        required?: string[];
      };

      expect(schema.properties?.duration?.type).toBe("string");
      expect(schema.properties?.localDateTime?.type).toBe("string");
      expect(schema.properties?.instant?.type).toBe("string");
      expect(schema.required).toEqual(["duration", "localDateTime", "instant"]);
    });

    it("returns empty schema for ToolContext-only input", () => {
      expect(
        JsonSchemaGenerator.generateForMethodInput(ToolContextSchema),
      ).toBe("{}");
    });

    it("generates object schema for tuple input while omitting ToolContext", () => {
      const inputSchema = JSON.parse(
        JsonSchemaGenerator.generateForMethodInput(
          z.tuple([z.string(), ToolContextSchema, z.number()]),
        ),
      ) as {
        properties: Record<string, { type: string }>;
        required: string[];
        type: string;
      };

      expect(inputSchema.type).toBe("object");
      expect(inputSchema.required).toEqual(["arg0", "arg1"]);
      expect(inputSchema.properties.arg0.type).toBe("string");
      expect(inputSchema.properties.arg1.type).toBe("number");
    });

    it("generates schema for method with additional properties disallowed by default", () => {
      const inputSchema = JSON.parse(
        JsonSchemaGenerator.generateForMethodInput(
          z.object({
            name: z.string(),
          }),
        ),
      ) as { additionalProperties?: boolean };

      expect(inputSchema.additionalProperties).toBe(false);
    });

    it("generates schema for method with additional properties allowed option", () => {
      const inputSchema = JSON.parse(
        JsonSchemaGenerator.generateForMethodInput(
          z.object({
            name: z.string(),
          }),
          SchemaOption.ALLOW_ADDITIONAL_PROPERTIES_BY_DEFAULT,
        ),
      ) as { additionalProperties?: boolean };

      expect(inputSchema.additionalProperties).toBeUndefined();
    });

    it("generates schema for method with upper-case types option", () => {
      const inputSchema = JSON.parse(
        JsonSchemaGenerator.generateForMethodInput(
          z.object({
            name: z.string(),
            age: z.int(),
          }),
          SchemaOption.UPPER_CASE_TYPE_VALUES,
        ),
      ) as {
        type?: string;
        properties?: Record<string, { type?: string }>;
      };

      expect(inputSchema.type).toBe("OBJECT");
      expect(inputSchema.properties?.name?.type).toBe("STRING");
      expect(inputSchema.properties?.age?.type).toBe("INTEGER");
    });

    it("removes direct property format from generated method input schema", () => {
      const inputSchema = JSON.parse(
        JsonSchemaGenerator.generateForMethodInput(
          z.object({
            createdAt: z.string().datetime(),
          }),
        ),
      ) as {
        properties?: Record<string, { format?: string; type?: string }>;
      };

      expect(inputSchema.properties?.createdAt?.type).toBe("string");
      expect(inputSchema.properties?.createdAt?.format).toBeUndefined();
    });
  });

  describe("convertTypeValuesToUpperCase", () => {
    it("should convert simple type value to uppercase", () => {
      const node = { type: "string" };
      JsonSchemaGenerator.convertTypeValuesToUpperCase(asJsonSchemaNode(node));
      expect(node.type).toBe("STRING");
    });

    it("should convert nested object type values", () => {
      const node = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "integer" },
        },
      };
      JsonSchemaGenerator.convertTypeValuesToUpperCase(asJsonSchemaNode(node));
      expect(node.type).toBe("OBJECT");
      expect(node.properties.name.type).toBe("STRING");
      expect(node.properties.age.type).toBe("INTEGER");
    });

    it("should convert array items type values", () => {
      const node = {
        type: "array",
        items: { type: "string" },
      };
      JsonSchemaGenerator.convertTypeValuesToUpperCase(asJsonSchemaNode(node));
      expect(node.type).toBe("ARRAY");
      expect(node.items.type).toBe("STRING");
    });

    it("should handle deeply nested structures", () => {
      const node = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              address: {
                type: "object",
                properties: {
                  street: { type: "string" },
                },
              },
            },
          },
        },
      };
      JsonSchemaGenerator.convertTypeValuesToUpperCase(asJsonSchemaNode(node));
      expect(node.type).toBe("OBJECT");
      expect(node.properties.user.type).toBe("OBJECT");
      expect(node.properties.user.properties.address.type).toBe("OBJECT");
      expect(
        node.properties.user.properties.address.properties.street.type,
      ).toBe("STRING");
    });

    it("should handle arrays with object elements", () => {
      const node: Record<string, unknown> = {
        type: "object",
        allOf: [
          { type: "object", properties: { name: { type: "string" } } },
          { type: "object", properties: { age: { type: "integer" } } },
        ],
      };
      JsonSchemaGenerator.convertTypeValuesToUpperCase(asJsonSchemaNode(node));
      const allOf = node.allOf as Record<string, unknown>[];
      const first = allOf[0] as Record<
        string,
        Record<string, Record<string, string>>
      >;
      const second = allOf[1] as Record<
        string,
        Record<string, Record<string, string>>
      >;
      expect(node.type).toBe("OBJECT");
      expect(first.type).toBe("OBJECT");
      expect(first.properties.name.type).toBe("STRING");
      expect(second.type).toBe("OBJECT");
      expect(second.properties.age.type).toBe("INTEGER");
    });

    it("should not modify non-type string values", () => {
      const node = {
        type: "string",
        description: "a description",
        format: "email",
      };
      JsonSchemaGenerator.convertTypeValuesToUpperCase(asJsonSchemaNode(node));
      expect(node.type).toBe("STRING");
      expect(node.description).toBe("a description");
      expect(node.format).toBe("email");
    });

    it("should handle empty object", () => {
      const node = {};
      JsonSchemaGenerator.convertTypeValuesToUpperCase(asJsonSchemaNode(node));
      expect(Object.keys(node)).toHaveLength(0);
    });
  });

  describe("SchemaOption", () => {
    it("should have ALLOW_ADDITIONAL_PROPERTIES_BY_DEFAULT", () => {
      expect(SchemaOption.ALLOW_ADDITIONAL_PROPERTIES_BY_DEFAULT).toBe(
        "ALLOW_ADDITIONAL_PROPERTIES_BY_DEFAULT",
      );
    });

    it("should have UPPER_CASE_TYPE_VALUES", () => {
      expect(SchemaOption.UPPER_CASE_TYPE_VALUES).toBe(
        "UPPER_CASE_TYPE_VALUES",
      );
    });
  });
});
