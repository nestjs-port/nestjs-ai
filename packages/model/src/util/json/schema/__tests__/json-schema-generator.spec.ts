import { describe, expect, it } from "vitest";
import { JsonSchemaGenerator, SchemaOption } from "../json-schema-generator";

describe("JsonSchemaGenerator", () => {
	describe("convertTypeValuesToUpperCase", () => {
		it("should convert simple type value to uppercase", () => {
			const node = { type: "string" };
			JsonSchemaGenerator.convertTypeValuesToUpperCase(node);
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
			JsonSchemaGenerator.convertTypeValuesToUpperCase(node);
			expect(node.type).toBe("OBJECT");
			expect(node.properties.name.type).toBe("STRING");
			expect(node.properties.age.type).toBe("INTEGER");
		});

		it("should convert array items type values", () => {
			const node = {
				type: "array",
				items: { type: "string" },
			};
			JsonSchemaGenerator.convertTypeValuesToUpperCase(node);
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
			JsonSchemaGenerator.convertTypeValuesToUpperCase(node);
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
			JsonSchemaGenerator.convertTypeValuesToUpperCase(node);
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
			JsonSchemaGenerator.convertTypeValuesToUpperCase(node);
			expect(node.type).toBe("STRING");
			expect(node.description).toBe("a description");
			expect(node.format).toBe("email");
		});

		it("should handle empty object", () => {
			const node = {};
			JsonSchemaGenerator.convertTypeValuesToUpperCase(node);
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
