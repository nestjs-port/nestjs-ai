import assert from "node:assert/strict";
import type { ModelOptions, ModelRequest } from "../../model";
import {
	AssistantMessage,
	type Message,
	MessageType,
	SystemMessage,
	type ToolResponseMessage,
	UserMessage,
} from "../messages";
import type { ChatOptions } from "./chat-options.interface";

/**
 * The Prompt class represents a prompt used in AI model requests.
 * A prompt consists of one or more messages and additional chat options.
 */
export class Prompt implements ModelRequest<Message[]> {
	private readonly messages: Message[];
	private readonly chatOptions: ChatOptions | null;

	constructor(content: string);
	constructor(message: Message);
	constructor(messages: Message[]);
	constructor(content: string, chatOptions: ChatOptions | null);
	constructor(message: Message, chatOptions: ChatOptions | null);
	constructor(messages: Message[], chatOptions: ChatOptions | null);
	constructor(
		contentOrMessageOrMessages: string | Message | Message[],
		chatOptions: ChatOptions | null = null,
	) {
		if (typeof contentOrMessageOrMessages === "string") {
			this.messages = [UserMessage.of(contentOrMessageOrMessages)];
		} else if (Array.isArray(contentOrMessageOrMessages)) {
			assert(contentOrMessageOrMessages, "messages cannot be null");
			this.messages = contentOrMessageOrMessages;
		} else {
			this.messages = [contentOrMessageOrMessages];
		}
		this.chatOptions = chatOptions;
	}

	/**
	 * Get the contents of all messages concatenated.
	 */
	get contents(): string {
		return this.instructions.map((message) => message.text ?? "").join("");
	}

	/**
	 * Get the chat options.
	 */
	get options(): ModelOptions | null {
		return this.chatOptions;
	}

	/**
	 * Get the messages (instructions).
	 */
	get instructions(): Message[] {
		return this.messages;
	}

	/**
	 * Get the first system message in the prompt.
	 * If no system message is found, an empty SystemMessage is returned.
	 */
	get systemMessage(): SystemMessage {
		for (const message of this.messages) {
			if (message.messageType === MessageType.SYSTEM) {
				return message as SystemMessage;
			}
		}
		return SystemMessage.of("");
	}

	/**
	 * Get the last user message in the prompt.
	 * If no user message is found, an empty UserMessage is returned.
	 */
	get userMessage(): UserMessage {
		for (let i = this.messages.length - 1; i >= 0; i--) {
			const message = this.messages[i];
			if (message.messageType === MessageType.USER) {
				return message as UserMessage;
			}
		}
		return UserMessage.of("");
	}

	/**
	 * Get the last user or tool response message in the prompt.
	 * If no user or tool response message is found, an empty UserMessage is returned.
	 */
	get lastUserOrToolResponseMessage(): Message {
		for (let i = this.messages.length - 1; i >= 0; i--) {
			const message = this.messages[i];
			if (
				message.messageType === MessageType.USER ||
				message.messageType === MessageType.TOOL
			) {
				return message;
			}
		}
		return UserMessage.of("");
	}

	/**
	 * Get all user messages in the prompt.
	 */
	get userMessages(): UserMessage[] {
		return this.messages.filter(
			(message) => message.messageType === MessageType.USER,
		) as UserMessage[];
	}

	/**
	 * Create a copy of this prompt.
	 */
	copy(): Prompt {
		return new Prompt(
			this.instructionsCopy(),
			this.chatOptions?.copy() ?? null,
		);
	}

	private instructionsCopy(): Message[] {
		return this.messages.map((message) => {
			const messageType = message.messageType;

			if (messageType === MessageType.USER) {
				return (message as UserMessage).copy();
			}
			if (messageType === MessageType.SYSTEM) {
				return (message as SystemMessage).copy();
			}
			if (messageType === MessageType.ASSISTANT) {
				const assistantMessage = message as AssistantMessage;
				return new AssistantMessage({
					content: assistantMessage.text ?? "",
					properties: assistantMessage.metadata,
					toolCalls: assistantMessage.toolCalls,
					media: assistantMessage.media,
				});
			}
			if (messageType === MessageType.TOOL) {
				const toolResponseMessage = message as ToolResponseMessage;
				return toolResponseMessage.copy();
			}

			throw new Error(`Unsupported message type: ${messageType}`);
		});
	}

	/**
	 * Augments the first system message in the prompt with the provided function.
	 * If no system message is found, a new one is created.
	 */
	augmentSystemMessage(
		augmenter: string | ((systemMessage: SystemMessage) => SystemMessage),
	): Prompt {
		if (typeof augmenter === "string") {
			return this.augmentSystemMessage(
				(systemMessage) =>
					new SystemMessage({
						content: augmenter,
						properties: { ...systemMessage.metadata },
					}),
			);
		}

		const messagesCopy = [...this.messages];
		let found = false;

		for (let i = 0; i < messagesCopy.length; i++) {
			const message = messagesCopy[i];
			if (message.messageType === MessageType.SYSTEM) {
				messagesCopy[i] = augmenter(message as SystemMessage);
				found = true;
				break;
			}
		}

		if (!found) {
			messagesCopy.unshift(augmenter(SystemMessage.of("")));
		}

		return new Prompt(messagesCopy, this.chatOptions?.copy() ?? null);
	}

	/**
	 * Augments the last user message in the prompt with the provided function.
	 * If no user message is found, a new one is created.
	 */
	augmentUserMessage(
		augmenter: string | ((userMessage: UserMessage) => UserMessage),
	): Prompt {
		if (typeof augmenter === "string") {
			return this.augmentUserMessage(
				(userMessage) =>
					new UserMessage({
						content: augmenter,
						properties: { ...userMessage.metadata },
						media: [...userMessage.media],
					}),
			);
		}

		const messagesCopy = [...this.messages];

		for (let i = messagesCopy.length - 1; i >= 0; i--) {
			const message = messagesCopy[i];
			if (message.messageType === MessageType.USER) {
				messagesCopy[i] = augmenter(message as UserMessage);
				return new Prompt(messagesCopy, this.chatOptions?.copy() ?? null);
			}
			if (i === 0) {
				messagesCopy.push(augmenter(UserMessage.of("")));
			}
		}

		return new Prompt(messagesCopy, this.chatOptions?.copy() ?? null);
	}

	/**
	 * Create a builder to mutate this prompt.
	 */
	mutate(): PromptBuilder {
		const builder = Prompt.builder().messages(this.instructionsCopy());
		if (this.chatOptions) {
			builder.chatOptions(this.chatOptions.copy());
		}
		return builder;
	}

	/**
	 * Create a new builder for Prompt.
	 */
	static builder(): PromptBuilder {
		return new PromptBuilder();
	}

	toString(): string {
		return `Prompt{messages=${JSON.stringify(this.messages)}, modelOptions=${JSON.stringify(this.chatOptions)}}`;
	}
}

/**
 * Builder for Prompt.
 */
export class PromptBuilder {
	private _messages: Message[] | null = null;
	private _chatOptions: ChatOptions | null = null;

	content(content: string): PromptBuilder {
		this._messages = [UserMessage.of(content)];
		return this;
	}

	messages(messages: Message[]): PromptBuilder;
	messages(...messages: Message[]): PromptBuilder;
	messages(
		messagesOrFirst: Message | Message[],
		...rest: Message[]
	): PromptBuilder {
		if (Array.isArray(messagesOrFirst) && rest.length === 0) {
			this._messages = messagesOrFirst;
		} else if (messagesOrFirst) {
			this._messages = [messagesOrFirst as Message, ...rest];
		}
		return this;
	}

	chatOptions(chatOptions: ChatOptions): PromptBuilder {
		this._chatOptions = chatOptions;
		return this;
	}

	build(): Prompt {
		assert(this._messages, "either messages or content needs to be set");
		return new Prompt(this._messages, this._chatOptions);
	}
}
