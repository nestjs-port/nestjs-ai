/**
 * Enumeration representing types of Messages in a chat application.
 * It can be one of the following: USER, ASSISTANT, SYSTEM, TOOL.
 */
export enum MessageType {
	/**
	 * A Message of type 'user', having the user role and originating
	 * from an end-user or developer.
	 */
	USER = "user",

	/**
	 * A Message of type 'assistant' passed in subsequent input
	 * Messages as the Message generated in response to the user.
	 */
	ASSISTANT = "assistant",

	/**
	 * A Message of type 'system' passed as input Messages containing
	 * high-level instructions for the conversation, such as behave
	 * like a certain character or provide answers in a specific format.
	 */
	SYSTEM = "system",

	/**
	 * A Message of type 'tool' passed as input Messages with
	 * function/tool content in a chat application.
	 */
	TOOL = "tool",
}
