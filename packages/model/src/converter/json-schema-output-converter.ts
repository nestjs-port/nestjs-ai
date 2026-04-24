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
import type { FromSchema, JSONSchema } from "json-schema-to-ts";

import {
  CompositeResponseTextCleaner,
  type CompositeResponseTextCleanerBuilder,
} from "./composite-response-text-cleaner.js";
import { MarkdownCodeBlockCleaner } from "./markdown-code-block-cleaner.js";
import type { ResponseTextCleaner } from "./response-text-cleaner.js";
import { ThinkingTagCleaner } from "./thinking-tag-cleaner.js";
import { WhitespaceCleaner } from "./whitespace-cleaner.js";

type JsonLiteralSchemaOutput<TSchema extends JSONSchema> = FromSchema<TSchema>;

export interface JsonLiteralOutputConverterProps<
  TSchema extends JSONSchema,
  TOutput = JsonLiteralSchemaOutput<TSchema>,
> {
  schema: TSchema;
  textCleaner?: ResponseTextCleaner;
  transformer?: (value: JsonLiteralSchemaOutput<TSchema>) => TOutput;
}

export class JsonSchemaOutputConverter<
  TSchema extends JSONSchema,
  TOutput = JsonLiteralSchemaOutput<TSchema>,
> {
  private readonly _schema: TSchema;
  private readonly _textCleaner: ResponseTextCleaner;
  private readonly _transformer:
    | ((value: JsonLiteralSchemaOutput<TSchema>) => TOutput)
    | null;

  constructor(props: JsonLiteralOutputConverterProps<TSchema, TOutput>) {
    assert(props.schema, "Schema cannot be null");
    this._schema = props.schema;
    this._textCleaner =
      props.textCleaner ?? JsonSchemaOutputConverter.createDefaultTextCleaner();
    this._transformer = props.transformer ?? null;
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

  convert(source: string): TOutput {
    try {
      const cleaned = this._textCleaner.clean(source);
      const parsed = JSON.parse(cleaned ?? "");
      if (this._transformer) {
        return this._transformer(parsed as JsonLiteralSchemaOutput<TSchema>);
      }
      return parsed as TOutput;
    } catch (error) {
      throw new Error(
        `Could not parse the given text to the desired target schema: "${source}"`,
        { cause: error },
      );
    }
  }

  get format(): string {
    const jsonSchema = JsonSchemaOutputConverter.generateSchema(this._schema);
    return `Your response should be in JSON format.
Do not include any explanations, only provide a RFC8259 compliant JSON response following this format without deviation.
Do not include markdown code blocks in your response.
Remove the \`\`\`json markdown from the output.
Here is the JSON Schema instance your output must adhere to:
\`\`\`${jsonSchema}\`\`\``;
  }

  get jsonSchema(): string {
    return JsonSchemaOutputConverter.generateSchema(this._schema);
  }

  private static generateSchema(schema: JSONSchema): string {
    const jsonNode =
      typeof schema === "object" && schema !== null
        ? JsonSchemaOutputConverter.withDefaultSchemaDraft(
            structuredClone(schema as Record<string, unknown>),
          )
        : schema;

    return JSON.stringify(jsonNode, null, 2).replace(/\n/g, EOL);
  }

  private static withDefaultSchemaDraft(
    schema: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!("$schema" in schema)) {
      schema.$schema = "https://json-schema.org/draft/2020-12/schema";
    }
    return schema;
  }
}
