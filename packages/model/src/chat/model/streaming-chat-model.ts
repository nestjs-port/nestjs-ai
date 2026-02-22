import type { Observable } from "rxjs";
import { map } from "rxjs/operators";
import type { StreamingModel } from "../../model";
import type { Message } from "../messages";
import { Prompt } from "../prompt";
import type { ChatResponse } from "./chat-response";

export abstract class StreamingChatModel
  implements StreamingModel<Prompt, ChatResponse>
{
  stream(message: string): Observable<string>;
  stream(...messages: Message[]): Observable<string>;
  stream(prompt: Prompt): Observable<ChatResponse>;
  stream(
    promptOrMessage: Prompt | string | Message,
    ...messages: Message[]
  ): Observable<ChatResponse | string> {
    if (promptOrMessage instanceof Prompt) {
      return this.streamPrompt(promptOrMessage);
    }

    const prompt =
      typeof promptOrMessage === "string"
        ? new Prompt(promptOrMessage)
        : new Prompt([promptOrMessage, ...messages]);

    return this.streamPrompt(prompt).pipe(
      map((response) => {
        const generation = response.result;
        return generation?.output.text ?? "";
      }),
    );
  }

  protected abstract streamPrompt(prompt: Prompt): Observable<ChatResponse>;
}
