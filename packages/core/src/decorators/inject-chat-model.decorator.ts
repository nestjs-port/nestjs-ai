import { Inject } from "@nestjs/common";
import { CHAT_MODEL_TOKEN } from "../constants";

/**
 * Decorator that injects the chat model instance.
 */
export const InjectChatModel = (): ParameterDecorator =>
	Inject(CHAT_MODEL_TOKEN);
