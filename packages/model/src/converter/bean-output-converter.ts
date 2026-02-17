import assert from "node:assert/strict";
import { EOL } from "node:os";
import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import { type ClassConstructor, plainToInstance } from "class-transformer";
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

type JsonObjectSchema = z.ZodObject<z.ZodRawShape>;
type JsonObjectArraySchema = z.ZodArray<JsonObjectSchema>;
export type JsonOrJsonArraySchema = JsonObjectSchema | JsonObjectArraySchema;
export type OutputTypeTarget<TSchema extends JsonOrJsonArraySchema> =
  z.infer<TSchema> extends Array<infer TItem> ? TItem : z.infer<TSchema>;

export interface BeanOutputConverterProps<
  TSchema extends JsonOrJsonArraySchema,
> {
  schema: TSchema;
  textCleaner?: ResponseTextCleaner;
  outputType?: ClassConstructor<OutputTypeTarget<TSchema>>;
}

export class BeanOutputConverter<TSchema extends JsonOrJsonArraySchema>
  implements StructuredOutputConverter<z.infer<TSchema>>
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
    const jsonNode = z.toJSONSchema(this._schema);
    this.postProcessSchema(jsonNode);
    this._jsonSchema = JSON.stringify(jsonNode, null, 2).replace(/\n/g, EOL);
  }

  protected postProcessSchema(_jsonNode: Record<string, unknown>): void {}

  convert(source: string): z.infer<TSchema> {
    try {
      const cleaned = this._textCleaner.clean(source);
      const parsed = JSON.parse(cleaned ?? "");
      const validated = this._schema.parse(parsed);

      if (!this._outputType) {
        return validated as z.infer<TSchema>;
      }

      return plainToInstance(this._outputType, validated) as z.infer<TSchema>;
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
}
