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
import type { StructuredOutputConverter } from "./structured-output-converter.js";
import { ThinkingTagCleaner } from "./thinking-tag-cleaner.js";
import { WhitespaceCleaner } from "./whitespace-cleaner.js";

type StandardSchemaWithJsonSchema = StandardSchemaV1 & StandardJSONSchemaV1;

export interface StandardSchemaOutputConverterProps<
  TSchema extends StandardSchemaWithJsonSchema,
> {
  schema: TSchema;
  textCleaner?: ResponseTextCleaner;
}

export class StandardSchemaOutputConverter<
  TSchema extends StandardSchemaWithJsonSchema,
> implements StructuredOutputConverter<
  StandardJSONSchemaV1.InferOutput<TSchema>
> {
  private readonly _schema: TSchema;
  private readonly _textCleaner: ResponseTextCleaner;

  constructor(props: StandardSchemaOutputConverterProps<TSchema>) {
    assert(props.schema, "Schema cannot be null");
    this._schema = props.schema;
    this._textCleaner =
      props.textCleaner ??
      StandardSchemaOutputConverter.createDefaultTextCleaner();
  }

  async convert(
    source: string,
  ): Promise<StandardJSONSchemaV1.InferOutput<TSchema>> {
    try {
      const cleaned = this._textCleaner.clean(source);
      const parsed = JSON.parse(cleaned ?? "");
      const result = await this._schema["~standard"].validate(parsed);

      if (result.issues) {
        throw new SchemaError(result.issues);
      }

      return result.value as StandardJSONSchemaV1.InferOutput<TSchema>;
    } catch (error) {
      throw new Error(
        `Could not parse the given text to the desired target schema: "${source}"`,
        { cause: error },
      );
    }
  }

  get format(): string {
    const jsonSchema = StandardSchemaOutputConverter.getJsonSchema(
      this._schema,
    );

    return `Your response should be in JSON format.
Do not include any explanations, only provide a RFC8259 compliant JSON response following this format without deviation.
Do not include markdown code blocks in your response.
Remove the \`\`\`json markdown from the output.
Here is the JSON Schema instance your output must adhere to:
\`\`\`${JSON.stringify(jsonSchema, null, 2)}\`\`\``;
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
    return schema["~standard"].jsonSchema.output({
      target: "draft-2020-12",
    });
  }
}
