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
  call(message: string): Promise<string | null>;
  call(...messages: Message[]): Promise<string | null>;
  call(prompt: Prompt): Promise<ChatResponse>;
  async call(
    promptOrMessage: Prompt | string | Message,
    ...messages: Message[]
  ): Promise<ChatResponse | string | null> {
    if (promptOrMessage instanceof Prompt) {
      return this.chatPrompt(promptOrMessage);
    }

    const prompt =
      typeof promptOrMessage === "string"
        ? new Prompt(promptOrMessage)
        : new Prompt([promptOrMessage, ...messages]);

    const generation = (await this.chatPrompt(prompt)).result;
    if (!generation) {
      return "";
    }

    return generation.output.text;
  }

  protected abstract chatPrompt(prompt: Prompt): Promise<ChatResponse>;

  get defaultOptions(): ChatOptions {
    return new DefaultChatOptions();
  }

  protected override streamPrompt(_prompt: Prompt): Observable<ChatResponse> {
    throw new Error("streaming is not supported");
  }
}
