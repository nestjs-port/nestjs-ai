import type { Observable } from "rxjs";
import { map } from "rxjs/operators";
import type { StreamingModel } from "../../model";
import type { Message } from "../messages";
import { Prompt } from "../prompt";
import type { ChatResponse } from "./chat-response";

export abstract class StreamingChatModel
  implements StreamingModel<Prompt, ChatResponse>
{
  streamString(message: string): Observable<string> {
    const prompt = new Prompt(message);
    return this.stream(prompt).pipe(
      map((response) => {
        const generation = response.result;
        return generation?.output.text ?? "";
      }),
    );
  }

  streamMessages(...messages: Message[]): Observable<string> {
    const prompt = new Prompt(messages);
    return this.stream(prompt).pipe(
      map((response) => {
        const generation = response.result;
        return generation?.output.text ?? "";
      }),
    );
  }

  abstract stream(prompt: Prompt): Observable<ChatResponse>;
}
