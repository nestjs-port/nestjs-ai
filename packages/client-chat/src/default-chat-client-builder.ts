import assert from "node:assert/strict";
import type { ObservationRegistry, TemplateRenderer } from "@nestjs-ai/commons";
import { NoopObservationRegistry } from "@nestjs-ai/commons";
import type {
  ChatModel,
  ChatOptions,
  Message,
  ToolCallback,
} from "@nestjs-ai/model";
import type { Advisor, AdvisorObservationConvention } from "./advisor";
import type { ChatClient } from "./chat-client";
import { DefaultChatClient } from "./default-chat-client";
import type { ChatClientObservationConvention } from "./observation";

export class DefaultChatClientBuilder implements ChatClient.Builder {
  protected readonly defaultRequest: DefaultChatClient.DefaultChatClientRequestSpec;

  constructor(chatModel: ChatModel);
  constructor(
    chatModel: ChatModel,
    observationRegistry: ObservationRegistry,
    chatClientObservationConvention: ChatClientObservationConvention | null,
    advisorObservationConvention: AdvisorObservationConvention | null,
  );
  constructor(
    chatModel: ChatModel,
    observationRegistry: ObservationRegistry = NoopObservationRegistry.INSTANCE,
    chatClientObservationConvention: ChatClientObservationConvention | null = null,
    advisorObservationConvention: AdvisorObservationConvention | null = null,
  ) {
    assert(chatModel, "the ChatModel must be non-null");
    assert(observationRegistry, "the ObservationRegistry must be non-null");
    this.defaultRequest = new DefaultChatClient.DefaultChatClientRequestSpec(
      chatModel,
      null,
      new Map<string, unknown>(),
      new Map<string, unknown>(),
      null,
      new Map<string, unknown>(),
      new Map<string, unknown>(),
      [],
      [],
      [],
      [],
      [],
      null,
      [],
      new Map<string, unknown>(),
      observationRegistry,
      chatClientObservationConvention,
      new Map<string, unknown>(),
      null,
      advisorObservationConvention,
    );
  }

  build(): ChatClient {
    return new DefaultChatClient(this.defaultRequest);
  }

  clone(): ChatClient.Builder {
    return this.defaultRequest.mutate();
  }

  defaultAdvisors(...advisors: Advisor[]): ChatClient.Builder;
  defaultAdvisors(
    advisorSpecConsumer: (advisorSpec: ChatClient.AdvisorSpec) => void,
  ): ChatClient.Builder;
  defaultAdvisors(advisors: Advisor[]): ChatClient.Builder;
  defaultAdvisors(...args: unknown[]): ChatClient.Builder {
    if (args.length === 1 && typeof args[0] === "function") {
      this.defaultRequest.advisors(
        args[0] as (advisorSpec: ChatClient.AdvisorSpec) => void,
      );
      return this;
    }
    if (args.length === 1 && Array.isArray(args[0])) {
      this.defaultRequest.advisors(args[0] as Advisor[]);
      return this;
    }
    (this.defaultRequest.advisors as (...values: unknown[]) => unknown)(
      ...args,
    );
    return this;
  }

  defaultOptions(chatOptions: ChatOptions): ChatClient.Builder {
    this.defaultRequest.options(chatOptions);
    return this;
  }

  defaultUser(text: string): ChatClient.Builder;
  defaultUser(text: Buffer, charset: BufferEncoding): ChatClient.Builder;
  defaultUser(text: Buffer): ChatClient.Builder;
  defaultUser(
    userSpecConsumer: (userSpec: ChatClient.PromptUserSpec) => void,
  ): ChatClient.Builder;
  defaultUser(
    textOrConsumer:
      | string
      | Buffer
      | ((userSpec: ChatClient.PromptUserSpec) => void),
    charset?: BufferEncoding,
  ): ChatClient.Builder {
    if (typeof textOrConsumer === "function") {
      this.defaultRequest.user(textOrConsumer);
      return this;
    }
    if (typeof textOrConsumer === "string") {
      this.defaultRequest.user(textOrConsumer);
      return this;
    }
    assert(textOrConsumer, "text cannot be null");
    const resolvedCharset: BufferEncoding = charset ?? "utf-8";
    this.defaultRequest.user(textOrConsumer.toString(resolvedCharset));
    return this;
  }

  defaultSystem(text: string): ChatClient.Builder;
  defaultSystem(text: Buffer, charset: BufferEncoding): ChatClient.Builder;
  defaultSystem(text: Buffer): ChatClient.Builder;
  defaultSystem(
    systemSpecConsumer: (systemSpec: ChatClient.PromptSystemSpec) => void,
  ): ChatClient.Builder;
  defaultSystem(
    textOrConsumer:
      | string
      | Buffer
      | ((systemSpec: ChatClient.PromptSystemSpec) => void),
    charset?: BufferEncoding,
  ): ChatClient.Builder {
    if (typeof textOrConsumer === "function") {
      this.defaultRequest.system(textOrConsumer);
      return this;
    }
    if (typeof textOrConsumer === "string") {
      this.defaultRequest.system(textOrConsumer);
      return this;
    }
    assert(textOrConsumer, "text cannot be null");
    const resolvedCharset: BufferEncoding = charset ?? "utf-8";
    this.defaultRequest.system(textOrConsumer.toString(resolvedCharset));
    return this;
  }

  defaultToolNames(...toolNames: string[]): ChatClient.Builder {
    this.defaultRequest.toolNames(...toolNames);
    return this;
  }

  defaultToolCallbacks(...toolCallbacks: ToolCallback[]): ChatClient.Builder;
  defaultToolCallbacks(toolCallbacks: ToolCallback[]): ChatClient.Builder;
  defaultToolCallbacks(
    ...toolCallbackProviders: ChatClient.ToolCallbackProvider[]
  ): ChatClient.Builder;
  defaultToolCallbacks(...args: unknown[]): ChatClient.Builder {
    if (args.length === 1 && Array.isArray(args[0])) {
      this.defaultRequest.toolCallbacks(args[0] as ToolCallback[]);
      return this;
    }
    (this.defaultRequest.toolCallbacks as (...values: unknown[]) => unknown)(
      ...args,
    );
    return this;
  }

  defaultTools(...toolObjects: unknown[]): ChatClient.Builder {
    this.defaultRequest.tools(...toolObjects);
    return this;
  }

  defaultToolContext(toolContext: Map<string, unknown>): ChatClient.Builder {
    this.defaultRequest.toolContext(toolContext);
    return this;
  }

  defaultTemplateRenderer(
    templateRenderer: TemplateRenderer,
  ): ChatClient.Builder {
    assert(templateRenderer, "templateRenderer cannot be null");
    this.defaultRequest.templateRenderer(templateRenderer);
    return this;
  }

  addMessages(messages: Message[]): void {
    this.defaultRequest.messages(messages);
  }
}
