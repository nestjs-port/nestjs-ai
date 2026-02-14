import assert from "node:assert/strict";
import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import { type ClassConstructor, plainToInstance } from "class-transformer";
import { targetConstructorToSchema } from "class-validator-jsonschema";
import {
	CompositeResponseTextCleaner,
	type CompositeResponseTextCleanerBuilder,
} from "./composite-response-text-cleaner";
import { MarkdownCodeBlockCleaner } from "./markdown-code-block-cleaner";
import type { ResponseTextCleaner } from "./response-text-cleaner";
import type { StructuredOutputConverter } from "./structured-output-converter";
import { ThinkingTagCleaner } from "./thinking-tag-cleaner";
import { WhitespaceCleaner } from "./whitespace-cleaner";

type ElementType<T> = T extends (infer U)[] ? U : T;

export class BeanOutputConverter<T> implements StructuredOutputConverter<T> {
	private readonly logger: Logger = LoggerFactory.getLogger(
		BeanOutputConverter.name,
	);
	private readonly _type: ClassConstructor<ElementType<T>>;
	private readonly _textCleaner: ResponseTextCleaner;
	private _jsonSchema: string;

	constructor(
		type: ClassConstructor<ElementType<T>>,
		textCleaner?: ResponseTextCleaner,
	) {
		assert(type, "Type cannot be null");
		this._type = type;
		this._textCleaner =
			textCleaner ?? BeanOutputConverter.createDefaultTextCleaner();
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
		const jsonNode = targetConstructorToSchema(this._type) as Record<
			string,
			unknown
		>;
		this.postProcessSchema(jsonNode);
		this._jsonSchema = JSON.stringify(jsonNode, null, 2);
	}

	protected postProcessSchema(_jsonNode: Record<string, unknown>): void {}

	convert(source: string): T {
		try {
			const cleaned = this._textCleaner.clean(source);
			const parsed = JSON.parse(cleaned ?? "");
			return plainToInstance(this._type, parsed) as T;
		} catch (error) {
			this.logger.error(
				`Could not parse the given text to the desired target type: "${source}" into ${this._type.name}`,
				error,
			);
			throw new Error(
				`Could not parse the given text to the desired target type: "${source}" into ${this._type.name}`,
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
