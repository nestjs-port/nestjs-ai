/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from "vitest";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";

import { JsonSchemaOutputConverter } from "../json-schema-output-converter.js";

const TestJsonSchema = {
  type: "object",
  properties: {
    someString: { type: "string" },
  },
  required: ["someString"],
  additionalProperties: false,
} as const satisfies JSONSchema;

class TestBean {
  someString = "";
}

type TestOutput = FromSchema<typeof TestJsonSchema>;

describe("JsonLiteralOutputConverter", () => {
  it("converts json literal schema output", async () => {
    const converter = new JsonSchemaOutputConverter({ schema: TestJsonSchema });
    const result = await converter.convert('{ "someString": "some value" }');
    expect(result as TestOutput).toEqual({ someString: "some value" });
  });

  it("fails to convert invalid json", async () => {
    const converter = new JsonSchemaOutputConverter({ schema: TestJsonSchema });
    const input = "{invalid json";

    let caughtError: unknown;
    try {
      await converter.convert(input);
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).cause).toBeInstanceOf(SyntaxError);
    expect((caughtError as Error).message).toBe(
      `Could not parse the given text to the desired target schema: "${input}"`,
    );
  });

  it("formats the json schema literal", () => {
    const converter = new JsonSchemaOutputConverter({ schema: TestJsonSchema });
    expect(converter.format).toContain('"someString"');
    expect(converter.jsonSchema).toContain('"type": "object"');
  });

  it("uses a custom transformer when provided", () => {
    const converter = new JsonSchemaOutputConverter<
      typeof TestJsonSchema,
      TestBean
    >({
      schema: TestJsonSchema,
      transformer: (value) => Object.assign(new TestBean(), value),
    });

    const result = converter.convert('{ "someString": "some value" }');

    expect(result).toBeInstanceOf(TestBean);
    expect(result.someString).toBe("some value");
  });
});
