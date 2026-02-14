import { describe, expect, it } from "vitest";
import { BeanOutputConverter } from "../bean-output-converter";

class TestClass {
	someString!: string;
}

describe("BeanOutputConverter", () => {
	describe("convert", () => {
		it("converts class type", () => {
			const converter = new BeanOutputConverter(TestClass);
			const testClass = converter.convert('{ "someString": "some value" }');
			expect(testClass.someString).toBe("some value");
		});

		it("fails to convert invalid json", () => {
			const converter = new BeanOutputConverter(TestClass);
			const input = "{invalid json";

			expect(() => converter.convert(input)).toThrowError(
				`Could not parse the given text to the desired target type: "${input}" into TestClass`,
			);

			try {
				converter.convert(input);
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).cause).toBeInstanceOf(SyntaxError);
			}
		});

		it("converts array payload", () => {
			const converter = new BeanOutputConverter<TestClass[]>(TestClass);
			const result = converter.convert('[{ "someString": "some value" }]');
			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(1);
			expect(result[0]?.someString).toBe("some value");
		});

		it("converts with thinking tags", () => {
			const converter = new BeanOutputConverter(TestClass);
			const text =
				'<thinking>This is my reasoning process...</thinking>{ "someString": "some value" }';
			const testClass = converter.convert(text);
			expect(testClass.someString).toBe("some value");
		});

		it("converts with thinking tags multiline", () => {
			const converter = new BeanOutputConverter(TestClass);
			const text = `<thinking>
This is my reasoning process
spanning multiple lines
</thinking>
{ "someString": "some value" }`;
			const testClass = converter.convert(text);
			expect(testClass.someString).toBe("some value");
		});

		it("converts with thinking tags and markdown code block", () => {
			const converter = new BeanOutputConverter(TestClass);
			const text = `<thinking>This is my reasoning process...</thinking>
\`\`\`json
{ "someString": "some value" }
\`\`\``;
			const testClass = converter.convert(text);
			expect(testClass.someString).toBe("some value");
		});

		it("converts with multiple thinking tags", () => {
			const converter = new BeanOutputConverter(TestClass);
			const text =
				'<thinking>First thought</thinking><thinking>Second thought</thinking>{ "someString": "some value" }';
			const testClass = converter.convert(text);
			expect(testClass.someString).toBe("some value");
		});

		it("converts with qwen think tags", () => {
			const converter = new BeanOutputConverter(TestClass);
			const text =
				'<think>Let me analyze this...</think>{ "someString": "qwen test" }';
			const testClass = converter.convert(text);
			expect(testClass.someString).toBe("qwen test");
		});

		it("converts with reasoning tags", () => {
			const converter = new BeanOutputConverter(TestClass);
			const text =
				'<reasoning>Internal reasoning process</reasoning>{ "someString": "reasoning test" }';
			const testClass = converter.convert(text);
			expect(testClass.someString).toBe("reasoning test");
		});

		it("converts with markdown thinking block", () => {
			const converter = new BeanOutputConverter(TestClass);
			const text = `\`\`\`thinking
This is a markdown-style thinking block
Used by some models
\`\`\`
{ "someString": "markdown thinking" }`;
			const testClass = converter.convert(text);
			expect(testClass.someString).toBe("markdown thinking");
		});

		it("converts with case insensitive tags", () => {
			const converter = new BeanOutputConverter(TestClass);
			const text =
				'<THINKING>UPPERCASE THINKING</THINKING>{ "someString": "case test" }';
			const testClass = converter.convert(text);
			expect(testClass.someString).toBe("case test");
		});

		it("converts with complex nested structure", () => {
			const converter = new BeanOutputConverter(TestClass);
			const text = `<thinking>Nova model reasoning</thinking>
<think>Qwen model analysis</think>

\`\`\`json
{ "someString": "complex test" }
\`\`\``;
			const testClass = converter.convert(text);
			expect(testClass.someString).toBe("complex test");
		});
	});

	describe("format", () => {
		it("contains schema and formatting guidance", () => {
			const converter = new BeanOutputConverter(TestClass);
			expect(converter.format).toContain(
				"Your response should be in JSON format.",
			);
			expect(converter.format).toContain(
				"Do not include markdown code blocks in your response.",
			);
			expect(converter.format).toContain("```json markdown");
			expect(converter.format).toContain(converter.jsonSchema);
		});

		it("normalizes line endings", () => {
			const converter = new BeanOutputConverter(TestClass);
			const formatOutput = converter.format;
			expect(formatOutput).toContain("\n");
			expect(formatOutput).not.toContain("\r\n");
			expect(formatOutput).not.toContain("\r");
		});
	});
});
