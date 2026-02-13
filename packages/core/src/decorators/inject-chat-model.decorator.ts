import { Inject } from "@nestjs/common";
import { CHAT_MODEL_TOKEN } from "@nestjs-ai/commons";

/**
 * Decorator that injects the chat model instance.
 */
export const InjectChatModel = (): ParameterDecorator =>
	Inject(CHAT_MODEL_TOKEN);
