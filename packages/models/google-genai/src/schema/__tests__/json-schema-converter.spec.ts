import { describe, expect, it } from "vitest";
import { JsonSchemaConverter } from "../json-schema-converter";

describe("JsonSchemaConverter", () => {
  it("should parse valid JSON with fromJson", () => {
    const json = '{"type":"object","properties":{"name":{"type":"string"}}}';
    const result = JsonSchemaConverter.fromJson(json);

    expect(result.type).toBe("object");
    expect(
      (result.properties as Record<string, Record<string, unknown>>).name.type,
    ).toBe("string");
  });

  it("should throw on invalid JSON with fromJson", () => {
    const invalidJson = "{invalid:json}";
    expect(() => JsonSchemaConverter.fromJson(invalidJson)).toThrow(
      "Failed to parse JSON",
    );
  });

  it("should throw on null input for convertToOpenApiSchema", () => {
    expect(() =>
      JsonSchemaConverter.convertToOpenApiSchema(null as never),
    ).toThrow("JSON Schema node must not be null");
  });

  it("should handle empty object with fromJson", () => {
    const result = JsonSchemaConverter.fromJson("{}");

    expect(result).not.toBeNull();
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("should throw on empty string with fromJson", () => {
    expect(() => JsonSchemaConverter.fromJson("")).toThrow(
      "Failed to parse JSON",
    );
  });

  it("should throw on null input with fromJson", () => {
    expect(() => JsonSchemaConverter.fromJson(null as never)).toThrow();
  });

  it("should handle boolean additionalProperties", () => {
    const json = JSON.stringify({
      type: "object",
      additionalProperties: true,
    });
    const result = JsonSchemaConverter.convertToOpenApiSchema(
      JsonSchemaConverter.fromJson(json),
    );
    expect(result.additionalProperties).toBe(true);
  });

  it("should handle enum property", () => {
    const json = JSON.stringify({
      type: "string",
      enum: ["a", "b", "c"],
    });
    const result = JsonSchemaConverter.convertToOpenApiSchema(
      JsonSchemaConverter.fromJson(json),
    );
    expect(result.enum).not.toBeNull();
    const enumValues = result.enum as string[];
    expect(enumValues[0]).toBe("a");
    expect(enumValues[1]).toBe("b");
    expect(enumValues[2]).toBe("c");
  });

  it("should handle OpenAPI specific properties", () => {
    const json = JSON.stringify({
      type: "string",
      nullable: true,
      readOnly: true,
      writeOnly: false,
      description: { propertyName: "type" },
    });
    const result = JsonSchemaConverter.convertToOpenApiSchema(
      JsonSchemaConverter.fromJson(json),
    );
    expect(result.nullable).toBe(true);
    expect(result.readOnly).toBe(true);
    expect(result.writeOnly).toBe(false);
    expect((result.description as Record<string, string>).propertyName).toBe(
      "type",
    );
  });

  describe("SchemaConversionTests", () => {
    it("should convert basic schema", () => {
      const json = JSON.stringify({
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name property",
          },
        },
        required: ["name"],
      });

      const result = JsonSchemaConverter.convertToOpenApiSchema(
        JsonSchemaConverter.fromJson(json),
      );

      expect(result.openapi).toBe("3.0.0");
      expect(result.type).toBe("object");
      const properties = result.properties as Record<
        string,
        Record<string, unknown>
      >;
      expect(properties.name.type).toBe("string");
      expect(properties.name.description).toBe("The name property");
      expect((result.required as string[])[0]).toBe("name");
    });

    it("should handle array types", () => {
      const json = JSON.stringify({
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
      });

      const result = JsonSchemaConverter.convertToOpenApiSchema(
        JsonSchemaConverter.fromJson(json),
      );

      const properties = result.properties as Record<
        string,
        Record<string, unknown>
      >;
      expect(properties.tags.type).toBe("array");
      expect((properties.tags.items as Record<string, unknown>).type).toBe(
        "string",
      );
    });

    it("should handle additional properties as object", () => {
      const json = JSON.stringify({
        type: "object",
        additionalProperties: {
          type: "string",
        },
      });

      const result = JsonSchemaConverter.convertToOpenApiSchema(
        JsonSchemaConverter.fromJson(json),
      );

      expect(
        (result.additionalProperties as Record<string, unknown>).type,
      ).toBe("string");
    });

    it("should handle combining schemas", () => {
      const json = JSON.stringify({
        type: "object",
        allOf: [
          {
            type: "object",
            properties: { name: { type: "string" } },
          },
          {
            type: "object",
            properties: { age: { type: "integer" } },
          },
        ],
      });

      const result = JsonSchemaConverter.convertToOpenApiSchema(
        JsonSchemaConverter.fromJson(json),
      );

      expect(result.allOf).not.toBeNull();
      expect(Array.isArray(result.allOf)).toBe(true);
      expect((result.allOf as unknown[]).length).toBe(2);
    });

    it("should copy common properties", () => {
      const json = JSON.stringify({
        type: "string",
        format: "email",
        description: "Email address",
        minLength: 5,
        maxLength: 100,
        pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        example: "user@example.com",
        deprecated: false,
      });

      const result = JsonSchemaConverter.convertToOpenApiSchema(
        JsonSchemaConverter.fromJson(json),
      );

      expect(result.type).toBe("string");
      expect(result.format).toBe("email");
      expect(result.description).toBe("Email address");
      expect(result.minLength).toBe(5);
      expect(result.maxLength).toBe(100);
      expect(result.pattern).toBe(
        "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      );
      expect(result.example).toBe("user@example.com");
      expect(result.deprecated).toBe(false);
    });

    it("should handle nested objects", () => {
      const json = JSON.stringify({
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              address: {
                type: "object",
                properties: {
                  street: { type: "string" },
                  city: { type: "string" },
                },
              },
            },
          },
        },
      });

      const result = JsonSchemaConverter.convertToOpenApiSchema(
        JsonSchemaConverter.fromJson(json),
      );

      const props = result.properties as Record<
        string,
        Record<string, unknown>
      >;
      const userProps = props.user.properties as Record<
        string,
        Record<string, unknown>
      >;
      const addressProps = userProps.address.properties as Record<
        string,
        Record<string, unknown>
      >;
      expect(addressProps.street.type).toBe("string");
      expect(addressProps.city.type).toBe("string");
    });
  });
});
