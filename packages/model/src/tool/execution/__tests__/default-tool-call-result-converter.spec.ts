import { describe, expect, it } from "vitest";
import { DefaultToolCallResultConverter } from "../default-tool-call-result-converter";

/**
 * Void type marker for TypeScript
 */
const VOID_TYPE = Symbol("void");

/**
 * Unit tests for {@link DefaultToolCallResultConverter}.
 */
describe("DefaultToolCallResultConverter", () => {
	const converter = new DefaultToolCallResultConverter();

	it("convert with null return type should return", () => {
		const result = converter.convert(null, null);
		expect(result).toBe("null");
	});

	it("convert void return type should return done json", () => {
		const result = converter.convert(null, VOID_TYPE);
		expect(result).toBe("null");
	});

	it("convert string return type should return json", () => {
		const result = converter.convert("test", String);
		expect(result).toBe('"test"');
	});

	it("convert null return value should return null json", () => {
		const result = converter.convert(null, String);
		expect(result).toBe("null");
	});

	it("convert object return type should return json", () => {
		const testObject = new TestObject("test", 42);
		const result = converter.convert(testObject, TestObject);

		// Helper function to normalize whitespace for comparison
		const normalizeWhitespace = (str: string): string => {
			return str.replace(/\s+/g, " ").trim();
		};

		const normalizedResult = normalizeWhitespace(result);
		expect(normalizedResult).toContain('"name":"test"');
		expect(normalizedResult).toContain('"value":42');
	});

	it("convert collection return type should return json", () => {
		const testList = ["one", "two", "three"];
		const result = converter.convert(testList, Array);
		expect(result).toBe('["one","two","three"]');
	});

	it("convert map return type should return json", () => {
		const testMap = new Map([
			["one", 1],
			["two", 2],
		]);
		const result = converter.convert(testMap, Map);

		// Helper function to normalize whitespace for comparison
		const normalizeWhitespace = (str: string): string => {
			return str.replace(/\s+/g, " ").trim();
		};

		const normalizedResult = normalizeWhitespace(result);
		expect(normalizedResult).toContain('"one":1');
		expect(normalizedResult).toContain('"two":2');
	});

	it("convert empty collections should return empty json", () => {
		expect(converter.convert([], Array)).toBe("[]");
		expect(converter.convert(new Map(), Map)).toBe("{}");
		expect(converter.convert([], Array)).toBe("[]");
	});

	it("convert record return type should return json", () => {
		const record: TestRecord = { name: "recordName", value: 1 };
		const result = converter.convert(record, Object);

		// Helper function to normalize whitespace for comparison
		const normalizeWhitespace = (str: string): string => {
			return str.replace(/\s+/g, " ").trim();
		};

		const normalizedResult = normalizeWhitespace(result);
		expect(normalizedResult).toContain('"recordName"');
		expect(normalizedResult).toContain("1");
	});

	it("convert special characters in strings should escape json", () => {
		const specialChars =
			'Test with "quotes", newlines\n, tabs\t, and backslashes\\';
		const result = converter.convert(specialChars, String);

		// Should properly escape JSON special characters
		expect(result).toContain('\\"quotes\\"');
		expect(result).toContain("\\n");
		expect(result).toContain("\\t");
		expect(result).toContain("\\\\");
	});
});

interface TestRecord {
	name: string;
	value: number;
}

class TestObject {
	private readonly name: string;

	private readonly value: number;

	constructor(name: string, value: number) {
		this.name = name;
		this.value = value;
	}

	getName(): string {
		return this.name;
	}

	getValue(): number {
		return this.value;
	}
}
