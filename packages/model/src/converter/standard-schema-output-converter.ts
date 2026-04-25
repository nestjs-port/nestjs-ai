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

import assert from "node:assert/strict";
import { EOL } from "node:os";
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import { SchemaError } from "@standard-schema/utils";

import {
  CompositeResponseTextCleaner,
  type CompositeResponseTextCleanerBuilder,
} from "./composite-response-text-cleaner.js";
import { MarkdownCodeBlockCleaner } from "./markdown-code-block-cleaner.js";
import type { ResponseTextCleaner } from "./response-text-cleaner.js";
import { StructuredOutputConverter } from "./structured-output-converter.js";
import { ThinkingTagCleaner } from "./thinking-tag-cleaner.js";
import { WhitespaceCleaner } from "./whitespace-cleaner.js";

type StandardSchemaWithJsonSchema = StandardSchemaV1 & StandardJSONSchemaV1;

export interface StandardSchemaOutputConverterProps<
  TSchema extends StandardSchemaWithJsonSchema,
  TOutput = StandardJSONSchemaV1.InferOutput<TSchema>,
> {
  schema: TSchema;
  textCleaner?: ResponseTextCleaner;
  transformer?: (value: StandardJSONSchemaV1.InferOutput<TSchema>) => TOutput;
}

export class StandardSchemaOutputConverter<
  TSchema extends StandardSchemaWithJsonSchema,
  TOutput = StandardJSONSchemaV1.InferOutput<TSchema>,
> extends StructuredOutputConverter<TOutput> {
  private readonly _schema: TSchema;
  private readonly _textCleaner: ResponseTextCleaner;
  private readonly _transformer:
    | ((value: StandardJSONSchemaV1.InferOutput<TSchema>) => TOutput)
    | null;

  constructor(props: StandardSchemaOutputConverterProps<TSchema, TOutput>) {
    super();
    assert(props.schema, "Schema cannot be null");
    this._schema = props.schema;
    this._textCleaner =
      props.textCleaner ??
      StandardSchemaOutputConverter.createDefaultTextCleaner();
    this._transformer = props.transformer ?? null;
  }

  async convert(source: string): Promise<TOutput> {
    try {
      const cleaned = this._textCleaner.clean(source);
      const parsed = JSON.parse(cleaned ?? "");
      const result = await this._schema["~standard"].validate(parsed);

      if (result.issues) {
        throw new SchemaError(result.issues);
      }

      const value = result.value as StandardJSONSchemaV1.InferOutput<TSchema>;
      if (this._transformer) {
        return this._transformer(value);
      }

      return value as TOutput;
    } catch (error) {
      throw new Error(
        `Could not parse the given text to the desired target schema: "${source}"`,
        { cause: error },
      );
    }
  }

  get format(): string {
    return `Your response should be in JSON format.
Do not include any explanations, only provide a RFC8259 compliant JSON response following this format without deviation.
Do not include markdown code blocks in your response.
Remove the \`\`\`json markdown from the output.
Here is the JSON Schema instance your output must adhere to:
\`\`\`${StandardSchemaOutputConverter.generateSchema(this._schema)}\`\`\``;
  }

  get jsonSchema(): string {
    return StandardSchemaOutputConverter.generateSchema(this._schema);
  }

  static createDefaultTextCleaner(): ResponseTextCleaner {
    const builder: CompositeResponseTextCleanerBuilder =
      CompositeResponseTextCleaner.builder();
    return builder
      .addCleaner(new WhitespaceCleaner())
      .addCleaner(new ThinkingTagCleaner())
      .addCleaner(new MarkdownCodeBlockCleaner())
      .addCleaner(new WhitespaceCleaner())
      .build();
  }

  private static getJsonSchema(schema: StandardSchemaWithJsonSchema): unknown {
    return schema["~standard"].jsonSchema.input({
      target: "draft-2020-12",
    });
  }

  private static generateSchema(schema: StandardSchemaWithJsonSchema): string {
    const jsonNode = StandardSchemaOutputConverter.getJsonSchema(schema);
    return JSON.stringify(jsonNode, null, 2).replace(/\n/g, EOL);
  }
}
