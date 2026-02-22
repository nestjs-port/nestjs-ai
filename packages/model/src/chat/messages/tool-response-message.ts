import { AbstractMessage } from "./abstract-message";
import { MessageType } from "./message-type";

/**
 * Represents a response from a tool/function call.
 */
export interface ToolResponse {
  readonly id: string;
  readonly name: string;
  readonly responseData: string;
}

export interface ToolResponseMessageProps {
  responses?: ToolResponse[];
  properties?: Record<string, unknown>;
}

/**
 * The ToolResponseMessage class represents a message with function/tool content
 * in a chat application.
 */
export class ToolResponseMessage extends AbstractMessage {
  protected readonly _responses: ToolResponse[];

  constructor(options: ToolResponseMessageProps = {}) {
    super(MessageType.TOOL, "", options.properties ?? {});
    this._responses = options.responses ?? [];
  }

  /**
   * Get the tool responses.
   */
  get responses(): ToolResponse[] {
    return this._responses;
  }

  /**
   * Create a copy of this message.
   */
  copy(): ToolResponseMessage {
    return new ToolResponseMessage({
      responses: [...this._responses],
      properties: { ...this.metadata },
    });
  }
}
