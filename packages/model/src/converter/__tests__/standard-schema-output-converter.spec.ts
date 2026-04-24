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
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import { SchemaError } from "@standard-schema/utils";
import { z } from "zod";

import { StandardSchemaOutputConverter } from "../standard-schema-output-converter.js";

const TestSchema = z.object({
  someString: z.string(),
});

const TransformSchema = z
  .object({
    some_string: z.string(),
  })
  .transform(({ some_string }) => ({
    someString: some_string,
  }));

const TestJsonSchema = {
  type: "object",
  properties: {
    someString: { type: "string" },
  },
  required: ["someString"],
  additionalProperties: false,
} as const;

const JsonSchemaBackedStandardSchema = {
  "~standard": {
    version: 1,
    vendor: "test",
    validate(value: unknown) {
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof (value as Record<string, unknown>).someString === "string"
      ) {
        return {
          value: value as { someString: string },
        };
      }

      return {
        issues: [{ message: "expected someString" }],
      };
    },
    jsonSchema: {
      input() {
        return TestJsonSchema;
      },
      output() {
        return TestJsonSchema;
      },
    },
  },
} as StandardSchemaV1<{ someString: string }> &
  StandardJSONSchemaV1<{ someString: string }> & {
    "~standard": StandardSchemaV1.Props<{ someString: string }> &
      StandardJSONSchemaV1.Props<{ someString: string }> & {
        jsonSchema: StandardJSONSchemaV1.Converter;
      };
  };

describe("StandardSchemaOutputConverter", () => {
  describe("convert", () => {
    it("converts zod standard schema output", async () => {
      const converter = new StandardSchemaOutputConverter({
        schema: TestSchema,
      });
      const result = await converter.convert('{ "someString": "some value" }');
      expect(result.someString).toBe("some value");
    });

    it("returns transformed zod output", async () => {
      const converter = new StandardSchemaOutputConverter({
        schema: TransformSchema,
      });

      const result = await converter.convert('{ "some_string": "some value" }');

      expect(result).toEqual({ someString: "some value" });
    });

    it("converts json schema backed standard schema output", async () => {
      const converter = new StandardSchemaOutputConverter({
        schema: JsonSchemaBackedStandardSchema,
      });
      const result = await converter.convert('{ "someString": "some value" }');
      expect(result.someString).toBe("some value");
    });

    it("fails when validation returns issues", async () => {
      const converter = new StandardSchemaOutputConverter({
        schema: JsonSchemaBackedStandardSchema,
      });

      let caughtError: unknown;
      try {
        await converter.convert('{ "someString": 123 }');
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).message).toBe(
        `Could not parse the given text to the desired target schema: "{ "someString": 123 }"`,
      );
      expect((caughtError as Error).cause).toBeInstanceOf(SchemaError);
    });
  });

  describe("format", () => {
    it("uses the standard json schema in the format", () => {
      const converter = new StandardSchemaOutputConverter({
        schema: JsonSchemaBackedStandardSchema,
      });

      expect(converter.format).toContain(
        "Your response should be in JSON format.",
      );
      expect(converter.format).toContain("someString");
    });
  });
});
