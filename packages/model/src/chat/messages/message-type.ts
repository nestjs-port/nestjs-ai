/**
 * Enumeration representing types of {@link Message Messages} in a chat application.
 * It can be one of the following: USER, ASSISTANT, SYSTEM, TOOL.
 */
export enum MessageType {
	/**
	 * A {@link Message} of type 'user', having the user role and originating
	 * from an end-user or developer.
	 * @see UserMessage
	 */
	USER = "user",

	/**
	 * A {@link Message} of type 'assistant' passed in subsequent input
	 * {@link Message Messages} as the {@link Message} generated in response to the user.
	 * @see AssistantMessage
	 */
	ASSISTANT = "assistant",

	/**
	 * A {@link Message} of type 'system' passed as input {@link Message Messages}
	 * containing high-level instructions for the conversation, such as behave
	 * like a certain character or provide answers in a specific format.
	 * @see SystemMessage
	 */
	SYSTEM = "system",

	/**
	 * A {@link Message} of type 'tool' passed as input {@link Message Messages}
	 * with function/tool content in a chat application.
	 * @see ToolResponseMessage
	 */
	TOOL = "tool",
}
