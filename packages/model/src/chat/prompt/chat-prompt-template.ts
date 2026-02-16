import type { Message } from "../messages";
import type { ChatOptions } from "./chat-options.interface";
import { Prompt } from "./prompt";
import type { PromptTemplate } from "./prompt-template";
import type { PromptTemplateActions } from "./prompt-template-actions.interface";
import type { PromptTemplateChatActions } from "./prompt-template-chat-actions.interface";

export class ChatPromptTemplate
  implements PromptTemplateActions, PromptTemplateChatActions
{
  private readonly _promptTemplates: PromptTemplate[];

  constructor(promptTemplates: PromptTemplate[]) {
    this._promptTemplates = promptTemplates;
  }

  render(): string;
  render(model: Record<string, unknown>): string;
  render(model?: Record<string, unknown>): string {
    return this._promptTemplates
      .map((pt) => (model != null ? pt.render(model) : pt.render()))
      .join("");
  }

  createMessages(): Message[];
  createMessages(model: Record<string, unknown>): Message[];
  createMessages(model?: Record<string, unknown>): Message[] {
    return this._promptTemplates.map((pt) =>
      model != null ? pt.createMessage(model) : pt.createMessage(),
    );
  }

  create(): Prompt;
  create(modelOptions: ChatOptions): Prompt;
  create(model: Record<string, unknown>): Prompt;
  create(model: Record<string, unknown>, modelOptions: ChatOptions): Prompt;
  create(
    modelOrOptions?: Record<string, unknown> | ChatOptions,
    modelOptions?: ChatOptions,
  ): Prompt {
    // create()
    if (modelOrOptions == null && modelOptions == null) {
      return new Prompt(this.createMessages());
    }
    // create(model, modelOptions)
    if (modelOrOptions != null && modelOptions != null) {
      return new Prompt(
        this.createMessages(modelOrOptions as Record<string, unknown>),
        modelOptions,
      );
    }
    // create(ChatOptions)
    if (
      modelOrOptions != null &&
      typeof modelOrOptions === "object" &&
      "copy" in modelOrOptions
    ) {
      return new Prompt(this.createMessages(), modelOrOptions as ChatOptions);
    }
    // create(model)
    return new Prompt(
      this.createMessages(modelOrOptions as Record<string, unknown>),
    );
  }
}
