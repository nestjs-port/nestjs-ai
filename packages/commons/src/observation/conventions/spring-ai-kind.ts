/**
 * Types of Spring AI constructs which can be observed.
 */
export class SpringAiKind {
	/**
	 * Spring AI kind for advisor.
	 */
	static readonly ADVISOR = new SpringAiKind("advisor");

	/**
	 * Spring AI kind for chat client.
	 */
	static readonly CHAT_CLIENT = new SpringAiKind("chat_client");

	/**
	 * Spring AI kind for tool calling.
	 */
	static readonly TOOL_CALL = new SpringAiKind("tool_call");

	/**
	 * Spring AI kind for vector store.
	 */
	static readonly VECTOR_STORE = new SpringAiKind("vector_store");

	private constructor(private readonly _value: string) {}

	/**
	 * Return the value of the Spring AI kind.
	 * @returns the value of the Spring AI kind
	 */
	get value(): string {
		return this._value;
	}
}
