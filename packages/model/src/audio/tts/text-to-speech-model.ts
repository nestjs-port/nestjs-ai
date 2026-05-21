import type { Model } from "../../model/model.interface.js";
import { DefaultTextToSpeechOptions } from "./default-text-to-speech-options.js";
import { StreamingTextToSpeechModel } from "./streaming-text-to-speech-model.js";
import type { TextToSpeechOptions } from "./text-to-speech-options.interface.js";
import { TextToSpeechPrompt } from "./text-to-speech-prompt.js";
import type { TextToSpeechResponse } from "./text-to-speech-response.js";

/**
 * Interface for the text to speech model.
 */
export abstract class TextToSpeechModel
  extends StreamingTextToSpeechModel
  implements Model<TextToSpeechPrompt, TextToSpeechResponse>
{
  call(text: string): Promise<Uint8Array>;
  call(prompt: TextToSpeechPrompt): Promise<TextToSpeechResponse>;
  async call(
    promptOrText: TextToSpeechPrompt | string,
  ): Promise<TextToSpeechResponse | Uint8Array> {
    if (promptOrText instanceof TextToSpeechPrompt) {
      return this.callPrompt(promptOrText);
    }

    const prompt = new TextToSpeechPrompt({ text: promptOrText });
    const result = (await this.callPrompt(prompt)).result;
    return result != null ? result.output : new Uint8Array(0);
  }

  protected abstract callPrompt(
    prompt: TextToSpeechPrompt,
  ): Promise<TextToSpeechResponse>;

  get defaultOptions(): TextToSpeechOptions {
    return new DefaultTextToSpeechOptions();
  }
}
