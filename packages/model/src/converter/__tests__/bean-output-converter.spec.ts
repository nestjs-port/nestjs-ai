import { describe, expect, it } from "vitest";
import { z } from "zod";
import { BeanOutputConverter } from "../bean-output-converter";

const TestSchema = z.object({
  someString: z.string(),
});

class TestBean {
  someString = "";
}

describe("BeanOutputConverter", () => {
  describe("convert", () => {
    it("converts zod schema type", () => {
      const converter = new BeanOutputConverter({ schema: TestSchema });
      const result = converter.convert('{ "someString": "some value" }');
      expect(result.someString).toBe("some value");
    });

    it("converts to class instance when output type is provided", () => {
      const converter = new BeanOutputConverter({
        schema: TestSchema,
        outputType: TestBean,
      });
      const result = converter.convert('{ "someString": "some value" }');
      expect(result).toBeInstanceOf(TestBean);
      expect(result.someString).toBe("some value");
    });

    it("fails to convert invalid json", () => {
      const converter = new BeanOutputConverter({ schema: TestSchema });
      const input = "{invalid json";

      expect(() => converter.convert(input)).toThrowError(
        `Could not parse the given text to the desired target schema: "${input}"`,
      );

      try {
        converter.convert(input);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).cause).toBeInstanceOf(SyntaxError);
      }
    });

    it("converts payload containing array field", () => {
      const converter = new BeanOutputConverter({
        schema: z.object({
          items: z.array(TestSchema),
        }),
      });
      const result = converter.convert(
        '{ "items": [{ "someString": "some value" }] }',
      );
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.someString).toBe("some value");
    });

    it("fails when schema validation fails", () => {
      const converter = new BeanOutputConverter({ schema: TestSchema });
      const input = '{ "someString": 123 }';

      expect(() => converter.convert(input)).toThrowError(
        `Could not parse the given text to the desired target schema: "${input}"`,
      );
    });

    it("converts with thinking tags", () => {
      const converter = new BeanOutputConverter({ schema: TestSchema });
      const text =
        '<thinking>This is my reasoning process...</thinking>{ "someString": "some value" }';
      const result = converter.convert(text);
      expect(result.someString).toBe("some value");
    });

    it("converts with thinking tags multiline", () => {
      const converter = new BeanOutputConverter({ schema: TestSchema });
      const text = `<thinking>
This is my reasoning process
spanning multiple lines
</thinking>
{ "someString": "some value" }`;
      const result = converter.convert(text);
      expect(result.someString).toBe("some value");
    });

    it("converts with thinking tags and markdown code block", () => {
      const converter = new BeanOutputConverter({ schema: TestSchema });
      const text = `<thinking>This is my reasoning process...</thinking>
\`\`\`json
{ "someString": "some value" }
\`\`\``;
      const result = converter.convert(text);
      expect(result.someString).toBe("some value");
    });

    it("converts with multiple thinking tags", () => {
      const converter = new BeanOutputConverter({ schema: TestSchema });
      const text =
        '<thinking>First thought</thinking><thinking>Second thought</thinking>{ "someString": "some value" }';
      const result = converter.convert(text);
      expect(result.someString).toBe("some value");
    });

    it("converts with qwen think tags", () => {
      const converter = new BeanOutputConverter({ schema: TestSchema });
      const text =
        '<think>Let me analyze this...</think>{ "someString": "qwen test" }';
      const result = converter.convert(text);
      expect(result.someString).toBe("qwen test");
    });

    it("converts with reasoning tags", () => {
      const converter = new BeanOutputConverter({ schema: TestSchema });
      const text =
        '<reasoning>Internal reasoning process</reasoning>{ "someString": "reasoning test" }';
      const result = converter.convert(text);
      expect(result.someString).toBe("reasoning test");
    });

    it("converts with markdown thinking block", () => {
      const converter = new BeanOutputConverter({ schema: TestSchema });
      const text = `\`\`\`thinking
This is a markdown-style thinking block
Used by some models
\`\`\`
{ "someString": "markdown thinking" }`;
      const result = converter.convert(text);
      expect(result.someString).toBe("markdown thinking");
    });

    it("converts with case insensitive tags", () => {
      const converter = new BeanOutputConverter({ schema: TestSchema });
      const text =
        '<THINKING>UPPERCASE THINKING</THINKING>{ "someString": "case test" }';
      const result = converter.convert(text);
      expect(result.someString).toBe("case test");
    });

    it("converts with complex nested structure", () => {
      const converter = new BeanOutputConverter({ schema: TestSchema });
      const text = `<thinking>Nova model reasoning</thinking>
<think>Qwen model analysis</think>

\`\`\`json
{ "someString": "complex test" }
\`\`\``;
      const result = converter.convert(text);
      expect(result.someString).toBe("complex test");
    });
  });

  describe("format", () => {
    it("contains schema and formatting guidance", () => {
      const converter = new BeanOutputConverter({ schema: TestSchema });
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
      const converter = new BeanOutputConverter({ schema: TestSchema });
      const formatOutput = converter.format;
      expect(formatOutput).toContain("\n");
      expect(formatOutput).not.toContain("\r\n");
      expect(formatOutput).not.toContain("\r");
    });
  });
});
