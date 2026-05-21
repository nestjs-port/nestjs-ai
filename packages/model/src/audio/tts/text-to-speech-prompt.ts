import type { ModelRequest } from "../../model/model-request.interface.js";
import { DefaultTextToSpeechOptions } from "./default-text-to-speech-options.js";
import { TextToSpeechMessage } from "./text-to-speech-message.js";
import type { TextToSpeechOptions } from "./text-to-speech-options.interface.js";

export interface TextToSpeechPromptProps {
  text?: string | null;
  message?: TextToSpeechMessage;
  options?: TextToSpeechOptions;
}

/**
 * Implementation of the {@link ModelRequest} interface for the text to speech prompt.
 */
export class TextToSpeechPrompt implements ModelRequest<TextToSpeechMessage> {
  private readonly _message: TextToSpeechMessage;
  private _options: TextToSpeechOptions;

  constructor(props: TextToSpeechPromptProps = {}) {
    this._message =
      props.message ?? new TextToSpeechMessage(props.text ?? null);
    this._options = props.options ?? new DefaultTextToSpeechOptions();
  }

  get instructions(): TextToSpeechMessage {
    return this._message;
  }

  get options(): TextToSpeechOptions {
    return this._options;
  }

  setOptions(options: TextToSpeechOptions): void {
    this._options = options;
  }
}
