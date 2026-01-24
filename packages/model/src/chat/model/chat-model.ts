import type { Observable } from "rxjs";
import type { Model } from "../../model";
import type { Message } from "../messages";
import { type ChatOptions, DefaultChatOptions, Prompt } from "../prompt";
import type { ChatResponse } from "./chat-response";
import { StreamingChatModel } from "./streaming-chat-model";

export abstract class ChatModel
	extends StreamingChatModel
	implements Model<Prompt, ChatResponse>
{
	callString(message: string): Promise<string | null> {
		const prompt = new Prompt(message);
		return this.call(prompt).then((response) => {
			const generation = response.result;
			return generation?.output.text ?? null;
		});
	}

	callMessages(...messages: Message[]): Promise<string | null> {
		const prompt = new Prompt(messages);
		return this.call(prompt).then((response) => {
			const generation = response.result;
			return generation?.output.text ?? null;
		});
	}

	abstract call(prompt: Prompt): Promise<ChatResponse>;

	get defaultOptions(): ChatOptions {
		return new DefaultChatOptions();
	}

	override stream(_prompt: Prompt): Observable<ChatResponse> {
		throw new Error("streaming is not supported");
	}
}
