export class ChatClientAttributes {
	static readonly OUTPUT_FORMAT = new ChatClientAttributes(
		"spring.ai.chat.client.output.format",
	);

	static readonly STRUCTURED_OUTPUT_SCHEMA = new ChatClientAttributes(
		"spring.ai.chat.client.structured.output.schema",
	);

	static readonly STRUCTURED_OUTPUT_NATIVE = new ChatClientAttributes(
		"spring.ai.chat.client.structured.output.native",
	);

	private readonly _key: string;

	private constructor(key: string) {
		this._key = key;
	}

	get key(): string {
		return this._key;
	}
}
