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

import { EOL } from "node:os";
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
  const TestJsonSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      someString: { type: "string" },
    },
    required: ["someString"],
    additionalProperties: false,
  } as const;

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

      let caughtError: unknown;
      try {
        converter.convert(input);
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).cause).toBeInstanceOf(SyntaxError);
      expect((caughtError as Error).message).toBe(
        `Could not parse the given text to the desired target schema: "${input}"`,
      );
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

    it("converts root array schema", () => {
      const converter = new BeanOutputConverter({
        schema: z.array(TestSchema),
        outputType: TestBean,
      });
      const result = converter.convert('[{ "someString": "some value" }]');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(TestBean);
      expect(result[0]?.someString).toBe("some value");
    });

    it("converts json schema literal type", () => {
      const converter = new BeanOutputConverter({ schema: TestJsonSchema });
      const result = converter.convert('{ "someString": "some value" }');
      expect(result.someString).toBe("some value");
    });

    it("fails when schema validation fails", () => {
      const converter = new BeanOutputConverter({ schema: TestSchema });
      const input = '{ "someString": 123 }';

      let caughtError: unknown;
      try {
        converter.convert(input);
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).message).toBe(
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
      expect(formatOutput).toContain(EOL);
      expect(formatOutput.includes("\r")).toBe(EOL !== "\n");
    });

    it("supports root array json schema", () => {
      const converter = new BeanOutputConverter({
        schema: z.array(TestSchema),
      });
      expect(converter.jsonSchema).toContain('"type": "array"');
      expect((converter.jsonSchemaMap as { type?: string }).type).toBe("array");
    });

    it("supports root array json schema literal", () => {
      const converter = new BeanOutputConverter({
        schema: {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "array",
          items: TestJsonSchema,
        },
      });
      expect(converter.jsonSchema).toContain('"$schema"');
      expect((converter.jsonSchemaMap as { type?: string }).type).toBe("array");
    });

    it("sets default $schema when json schema literal misses it", () => {
      const converter = new BeanOutputConverter({
        schema: {
          type: "object",
          properties: { someString: { type: "string" } },
          required: ["someString"],
        },
      });

      expect((converter.jsonSchemaMap as { $schema?: string }).$schema).toBe(
        "https://json-schema.org/draft/2020-12/schema",
      );
    });
  });

  describe("type constraints", () => {
    it("rejects invalid schema types at compile time", () => {
      // @ts-expect-error schema must be a JSON Schema object, not a raw JSON array
      new BeanOutputConverter({ schema: [] });

      // @ts-expect-error non-JSON zod schema is not supported
      new BeanOutputConverter({ schema: z.string() });

      // @ts-expect-error zod array items must be JSON object schemas
      new BeanOutputConverter({ schema: z.array(z.string()) });

      new BeanOutputConverter({
        schema: {
          // @ts-expect-error invalid JSON Schema type literal
          type: "not-a-valid-json-schema-type",
        },
      });

      new BeanOutputConverter({
        schema: {
          type: "object",
          // @ts-expect-error invalid JSON Schema required keyword
          required: "someString",
        },
      });
    });
  });
});
