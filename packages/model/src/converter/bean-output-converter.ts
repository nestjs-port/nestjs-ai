import assert from "node:assert/strict";
import { EOL } from "node:os";
import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import { type ClassConstructor, plainToInstance } from "class-transformer";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { z } from "zod";
import {
  CompositeResponseTextCleaner,
  type CompositeResponseTextCleanerBuilder,
} from "./composite-response-text-cleaner";
import { MarkdownCodeBlockCleaner } from "./markdown-code-block-cleaner";
import type { ResponseTextCleaner } from "./response-text-cleaner";
import type { StructuredOutputConverter } from "./structured-output-converter";
import { ThinkingTagCleaner } from "./thinking-tag-cleaner";
import { WhitespaceCleaner } from "./whitespace-cleaner";

type ZodJsonObjectSchema = z.ZodObject<z.ZodRawShape>;
type ZodJsonObjectArraySchema = z.ZodArray<ZodJsonObjectSchema>;
type ZodJsonOrJsonArraySchema = ZodJsonObjectSchema | ZodJsonObjectArraySchema;

const DEFAULT_JSON_SCHEMA_DRAFT =
  "https://json-schema.org/draft/2020-12/schema";

export type JsonOrJsonArraySchema = ZodJsonOrJsonArraySchema | JSONSchema;
export type SchemaOutput<TSchema extends JsonOrJsonArraySchema> =
  TSchema extends ZodJsonOrJsonArraySchema
    ? z.infer<TSchema>
    : TSchema extends JSONSchema
      ? FromSchema<TSchema>
      : never;
export type OutputTypeTarget<TSchema extends JsonOrJsonArraySchema> =
  SchemaOutput<TSchema> extends Array<infer TItem>
    ? TItem
    : SchemaOutput<TSchema>;

export interface BeanOutputConverterProps<
  TSchema extends JsonOrJsonArraySchema,
> {
  schema: TSchema;
  textCleaner?: ResponseTextCleaner;
  outputType?: ClassConstructor<OutputTypeTarget<TSchema>>;
}

export class BeanOutputConverter<TSchema extends JsonOrJsonArraySchema>
  implements StructuredOutputConverter<SchemaOutput<TSchema>>
{
  private readonly logger: Logger = LoggerFactory.getLogger(
    BeanOutputConverter.name,
  );
  private readonly _schema: TSchema;
  private readonly _textCleaner: ResponseTextCleaner;
  private readonly _outputType: ClassConstructor<
    OutputTypeTarget<TSchema>
  > | null;
  private _jsonSchema: string;

  constructor(props: BeanOutputConverterProps<TSchema>) {
    assert(props.schema, "Schema cannot be null");
    this._schema = props.schema;
    this._textCleaner =
      props.textCleaner ?? BeanOutputConverter.createDefaultTextCleaner();
    this._outputType = props.outputType ?? null;
    this._jsonSchema = "";
    this.generateSchema();
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

  private generateSchema(): void {
    const jsonNode = BeanOutputConverter.isZodSchema(this._schema)
      ? z.toJSONSchema(this._schema)
      : BeanOutputConverter.withDefaultSchemaDraft(
          structuredClone(this._schema as Record<string, unknown>),
        );
    this.postProcessSchema(jsonNode);
    this._jsonSchema = JSON.stringify(jsonNode, null, 2).replace(/\n/g, EOL);
  }

  protected postProcessSchema(_jsonNode: Record<string, unknown>): void {}

  convert(source: string): SchemaOutput<TSchema> {
    try {
      const cleaned = this._textCleaner.clean(source);
      const parsed = JSON.parse(cleaned ?? "");
      const validated = BeanOutputConverter.isZodSchema(this._schema)
        ? this._schema.parse(parsed)
        : parsed;

      if (!this._outputType) {
        return validated as SchemaOutput<TSchema>;
      }

      return plainToInstance(
        this._outputType,
        validated,
      ) as SchemaOutput<TSchema>;
    } catch (error) {
      this.logger.error(
        `Could not parse the given text to the desired target schema: "${source}"`,
        error,
      );
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
\`\`\`${this._jsonSchema}\`\`\``;
  }

  get jsonSchema(): string {
    return this._jsonSchema;
  }

  get jsonSchemaMap(): Record<string, unknown> {
    try {
      return JSON.parse(this._jsonSchema) as Record<string, unknown>;
    } catch (error) {
      throw new Error("Could not parse the JSON Schema to a Map object", {
        cause: error,
      });
    }
  }

  private static isZodSchema(
    schema: JsonOrJsonArraySchema,
  ): schema is ZodJsonOrJsonArraySchema {
    if (schema instanceof z.ZodType) {
      return true;
    }

    return (
      typeof schema === "object" &&
      schema !== null &&
      "parse" in schema &&
      typeof schema.parse === "function"
    );
  }

  private static withDefaultSchemaDraft(
    schema: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!("$schema" in schema)) {
      schema.$schema = DEFAULT_JSON_SCHEMA_DRAFT;
    }
    return schema;
  }
}
