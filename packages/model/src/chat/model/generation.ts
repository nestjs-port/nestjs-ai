import assert from "node:assert/strict";
import type { ModelResult } from "../../model";
import type { AssistantMessage } from "../messages";
import { ChatGenerationMetadata } from "../metadata";

/**
 * Properties for creating a Generation instance.
 */
export interface GenerationProps {
  assistantMessage: AssistantMessage;
  chatGenerationMetadata?: ChatGenerationMetadata;
}

/**
 * Represents a response returned by the AI.
 */
export class Generation implements ModelResult<AssistantMessage> {
  private readonly _assistantMessage: AssistantMessage;
  private readonly _chatGenerationMetadata: ChatGenerationMetadata;

  constructor(props: GenerationProps) {
    assert(props.assistantMessage, "AssistantMessage must not be null");
    this._assistantMessage = props.assistantMessage;
    this._chatGenerationMetadata =
      props.chatGenerationMetadata ?? ChatGenerationMetadata.NULL;
  }

  get output(): AssistantMessage {
    return this._assistantMessage;
  }

  get metadata(): ChatGenerationMetadata {
    return this._chatGenerationMetadata;
  }
}
