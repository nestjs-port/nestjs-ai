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
        z.object({
          name: z.string(),
          age: z.int(),
        }),
      );

      expect(schema).toMatchInlineSnapshot(`
        "{
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            },
            "age": {
              "type": "integer",
              "minimum": -9007199254740991,
              "maximum": 9007199254740991
            }
          },
          "required": [
            "name",
            "age"
          ],
          "additionalProperties": false
        }"
      `);
    });

    it("generates schema for method with descriptions and optional fields", () => {
      const schema = JsonSchemaGenerator.generateForMethodInput(
        z.object({
          username: z
            .string()
            .describe("The username of the customer")
            .optional(),
          password: z.string(),
        }),
      );

      expect(schema).toMatchInlineSnapshot(`
        "{
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "username": {
              "type": "string",
              "description": "The username of the customer"
            },
            "password": {
              "type": "string"
            }
          },
          "required": [
            "password"
          ],
          "additionalProperties": false
        }"
      `);
    });

    it("generates schema for method when parameters are required by default", () => {
      const schema = JsonSchemaGenerator.generateForMethodInput(
        z.object({
          username: z.string(),
          password: z.string(),
        }),
      );

      expect(schema).toMatchInlineSnapshot(`
        "{
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "username": {
              "type": "string"
            },
            "password": {
              "type": "string"
            }
          },
          "required": [
            "username",
            "password"
          ],
          "additionalProperties": false
        }"
      `);
    });

    it("generates schema for method with object parameter", () => {
      const schema = JsonSchemaGenerator.generateForMethodInput(
        z.object({
          object: z.unknown(),
        }),
      );

      expect(schema).toMatchInlineSnapshot(`
        "{
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "object": {}
          },
          "required": [
            "object"
          ],
          "additionalProperties": false
        }"
      `);
    });

    it("generates schema for method with nullable-like parameter", () => {
      const schema = JsonSchemaGenerator.generateForMethodInput(
        z.object({
          username: z.string().nullable().optional(),
          password: z.string(),
        }),
      );

      expect(schema).toMatchInlineSnapshot(`
        "{
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "username": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ]
            },
            "password": {
              "type": "string"
            }
          },
          "required": [
            "password"
          ],
          "additionalProperties": false
        }"
      `);
    });

    it("generates schema for method with complex parameters", () => {
      const schema = JsonSchemaGenerator.generateForMethodInput(
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
      );

      expect(schema).toMatchInlineSnapshot(`
        "{
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "items": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "data": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "integer",
                  "minimum": -9007199254740991,
                  "maximum": 9007199254740991
                },
                "name": {
                  "type": "string",
                  "description": "The special name"
                }
              },
              "required": [
                "id",
                "name"
              ],
              "additionalProperties": false
            },
            "moreData": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "integer",
                  "minimum": -9007199254740991,
                  "maximum": 9007199254740991
                },
                "name": {
                  "type": "string",
                  "description": "Even more special name"
                }
              },
              "required": [
                "id",
                "name"
              ],
              "additionalProperties": false,
              "description": "Much more data"
            }
          },
          "required": [
            "items",
            "data",
            "moreData"
          ],
          "additionalProperties": false
        }"
      `);
    });

    it("generates schema for method with time parameters", () => {
      const schema = JsonSchemaGenerator.generateForMethodInput(
        z.object({
          duration: z.string(),
          localDateTime: z.string(),
          instant: z.string(),
        }),
      );

      expect(schema).toMatchInlineSnapshot(`
        "{
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "duration": {
              "type": "string"
            },
            "localDateTime": {
              "type": "string"
            },
            "instant": {
              "type": "string"
            }
          },
          "required": [
            "duration",
            "localDateTime",
            "instant"
          ],
          "additionalProperties": false
        }"
      `);
    });

    it("returns empty schema for null input", () => {
      const schema = JsonSchemaGenerator.generateForMethodInput(null);
      expect(schema).toMatchInlineSnapshot(`"{}"`);
    });

    it("removes ToolContextSchema fields from method input schema", () => {
      const schema = JsonSchemaGenerator.generateForMethodInput(
        z.object({
          name: z.string(),
          toolContext: ToolContextSchema,
          count: z.number(),
        }),
      );

      expect(schema).toMatchInlineSnapshot(`
        "{
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            },
            "count": {
              "type": "number"
            }
          },
          "required": [
            "name",
            "count"
          ],
          "additionalProperties": false
        }"
      `);
    });

    it("generates schema for method with additional properties disallowed by default", () => {
      const schema = JsonSchemaGenerator.generateForMethodInput(
        z.object({
          name: z.string(),
        }),
      );

      expect(schema).toMatchInlineSnapshot(`
        "{
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            }
          },
          "required": [
            "name"
          ],
          "additionalProperties": false
        }"
      `);
    });

    it("generates schema for method with additional properties allowed option", () => {
      const schema = JsonSchemaGenerator.generateForMethodInput(
        z.object({
          name: z.string(),
        }),
        SchemaOption.ALLOW_ADDITIONAL_PROPERTIES_BY_DEFAULT,
      );

      expect(schema).toMatchInlineSnapshot(`
        "{
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            }
          },
          "required": [
            "name"
          ]
        }"
      `);
    });

    it("generates schema for method with upper-case types option", () => {
      const schema = JsonSchemaGenerator.generateForMethodInput(
        z.object({
          name: z.string(),
          age: z.int(),
        }),
        SchemaOption.UPPER_CASE_TYPE_VALUES,
      );

      expect(schema).toMatchInlineSnapshot(`
        "{
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "OBJECT",
          "properties": {
            "name": {
              "type": "STRING"
            },
            "age": {
              "type": "INTEGER",
              "minimum": -9007199254740991,
              "maximum": 9007199254740991
            }
          },
          "required": [
            "name",
            "age"
          ],
          "additionalProperties": false
        }"
      `);
    });

    it("removes direct property format from generated method input schema", () => {
      const schema = JsonSchemaGenerator.generateForMethodInput(
        z.object({
          createdAt: z.iso.datetime(),
        }),
      );

      expect(schema).toMatchInlineSnapshot(`
        "{
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "createdAt": {
              "type": "string",
              "pattern": "^(?:(?:\\\\d\\\\d[2468][048]|\\\\d\\\\d[13579][26]|\\\\d\\\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\\\d|30)|(?:02)-(?:0[1-9]|1\\\\d|2[0-8])))T(?:(?:[01]\\\\d|2[0-3]):[0-5]\\\\d(?::[0-5]\\\\d(?:\\\\.\\\\d+)?)?(?:Z))$"
            }
          },
          "required": [
            "createdAt"
          ],
          "additionalProperties": false
        }"
      `);
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
