import assert from "node:assert/strict";
import type {
  Media,
  MimeType,
  ObservationRegistry,
  TemplateRenderer,
} from "@nestjs-ai/commons";
import { NoopObservationRegistry } from "@nestjs-ai/commons";
import type {
  ChatModel,
  ChatOptions,
  ChatResponse,
  Message,
  Prompt,
  StructuredOutputConverter,
  ToolCallback,
} from "@nestjs-ai/model";
import type { Observable } from "rxjs";
import type { z } from "zod";
import type { Advisor, AdvisorObservationConvention } from "./advisor";
import type { ChatClientResponse } from "./chat-client-response";
import { DefaultChatClientBuilder } from "./default-chat-client-builder";
import type { ChatClientObservationConvention } from "./observation";
import type { ResponseEntity } from "./response-entity";

export interface ChatClient {
  prompt(): ChatClient.ChatClientRequestSpec;

  prompt(content: string): ChatClient.ChatClientRequestSpec;

  prompt(prompt: Prompt): ChatClient.ChatClientRequestSpec;

  mutate(): ChatClient.Builder;
}

export namespace ChatClient {
  type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;

  export function create(chatModel: ChatModel): ChatClient;

  export function create(
    chatModel: ChatModel,
    observationRegistry: ObservationRegistry,
  ): ChatClient;

  export function create(
    chatModel: ChatModel,
    observationRegistry: ObservationRegistry,
    chatClientObservationConvention: ChatClientObservationConvention | null,
    advisorObservationConvention: AdvisorObservationConvention | null,
  ): ChatClient;

  export function create(
    chatModel: ChatModel,
    observationRegistry: ObservationRegistry = NoopObservationRegistry.INSTANCE,
    chatClientObservationConvention: ChatClientObservationConvention | null = null,
    advisorObservationConvention: AdvisorObservationConvention | null = null,
  ): ChatClient {
    assert(chatModel, "chatModel cannot be null");
    assert(observationRegistry, "observationRegistry cannot be null");
    return builder(
      chatModel,
      observationRegistry,
      chatClientObservationConvention,
      advisorObservationConvention,
    ).build();
  }

  export function builder(chatModel: ChatModel): Builder;

  export function builder(
    chatModel: ChatModel,
    observationRegistry: ObservationRegistry,
    chatClientObservationConvention: ChatClientObservationConvention | null,
    advisorObservationConvention: AdvisorObservationConvention | null,
  ): Builder;

  export function builder(
    chatModel: ChatModel,
    observationRegistry: ObservationRegistry = NoopObservationRegistry.INSTANCE,
    chatClientObservationConvention: ChatClientObservationConvention | null = null,
    advisorObservationConvention: AdvisorObservationConvention | null = null,
  ): Builder {
    assert(chatModel, "chatModel cannot be null");
    assert(observationRegistry, "observationRegistry cannot be null");
    return new DefaultChatClientBuilder(
      chatModel,
      observationRegistry,
      chatClientObservationConvention,
      advisorObservationConvention,
    );
  }

  export type Type<T> = new (...args: never[]) => T;
  export type EntityOptions = {
    readonly isArray?: boolean;
  };

  export interface ToolCallbackProvider {
    readonly toolCallbacks: ToolCallback[];
  }

  export interface PromptUserSpec {
    text(text: string): PromptUserSpec;
    text(text: Buffer, charset: BufferEncoding): PromptUserSpec;
    text(text: Buffer): PromptUserSpec;
    params(p: Map<string, unknown>): PromptUserSpec;
    param(k: string, v: unknown): PromptUserSpec;
    media(...media: Media[]): PromptUserSpec;
    media(mimeType: MimeType, url: URL): PromptUserSpec;
    media(mimeType: MimeType, resource: Buffer): PromptUserSpec;
    metadata(metadata: Map<string, unknown>): PromptUserSpec;
    metadata(k: string, v: unknown): PromptUserSpec;
  }

  export interface PromptSystemSpec {
    text(text: string): PromptSystemSpec;
    text(text: Buffer, charset: BufferEncoding): PromptSystemSpec;
    text(text: Buffer): PromptSystemSpec;
    params(p: Map<string, unknown>): PromptSystemSpec;
    param(k: string, v: unknown): PromptSystemSpec;
    metadata(metadata: Map<string, unknown>): PromptSystemSpec;
    metadata(k: string, v: unknown): PromptSystemSpec;
  }

  export interface AdvisorSpec {
    param(k: string, v: unknown): AdvisorSpec;
    params(p: Map<string, unknown>): AdvisorSpec;
    advisors(...advisors: Advisor[]): AdvisorSpec;
    advisors(advisors: Advisor[]): AdvisorSpec;
  }

  export interface CallResponseSpec {
    entity<TSchema extends ZodObjectSchema>(
      schema: TSchema,
      outputType?: Type<z.infer<TSchema>>,
    ): Promise<z.infer<TSchema> | null>;
    entity<T>(
      structuredOutputConverter: StructuredOutputConverter<T>,
    ): Promise<T | null>;
    chatClientResponse(): Promise<ChatClientResponse>;
    chatResponse(): Promise<ChatResponse | null>;
    content(): Promise<string | null>;
    responseEntity<TSchema extends ZodObjectSchema>(
      schema: TSchema,
      outputType?: Type<z.infer<TSchema>>,
    ): Promise<ResponseEntity<ChatResponse, z.infer<TSchema>>>;
    responseEntity<T>(
      structuredOutputConverter: StructuredOutputConverter<T>,
    ): Promise<ResponseEntity<ChatResponse, T>>;
  }

  export interface StreamResponseSpec {
    chatClientResponse(): Observable<ChatClientResponse>;
    chatResponse(): Observable<ChatResponse>;
    content(): Observable<string>;
  }

  export interface ChatClientRequestSpec {
    mutate(): Builder;
    advisors(
      consumer: (advisorSpec: AdvisorSpec) => void,
    ): ChatClientRequestSpec;
    advisors(...advisors: Advisor[]): ChatClientRequestSpec;
    advisors(advisors: Advisor[]): ChatClientRequestSpec;
    messages(...messages: Message[]): ChatClientRequestSpec;
    messages(messages: Message[]): ChatClientRequestSpec;
    options<T extends ChatOptions>(options: T): ChatClientRequestSpec;
    toolNames(...toolNames: string[]): ChatClientRequestSpec;
    tools(...toolObjects: unknown[]): ChatClientRequestSpec;
    toolCallbacks(...toolCallbacks: ToolCallback[]): ChatClientRequestSpec;
    toolCallbacks(toolCallbacks: ToolCallback[]): ChatClientRequestSpec;
    toolCallbacks(
      ...toolCallbackProviders: ToolCallbackProvider[]
    ): ChatClientRequestSpec;
    toolContext(toolContext: Map<string, unknown>): ChatClientRequestSpec;
    system(text: string): ChatClientRequestSpec;
    system(
      textResource: Buffer,
      charset: BufferEncoding,
    ): ChatClientRequestSpec;
    system(text: Buffer): ChatClientRequestSpec;
    system(
      consumer: (promptSystemSpec: PromptSystemSpec) => void,
    ): ChatClientRequestSpec;
    user(text: string): ChatClientRequestSpec;
    user(text: Buffer, charset: BufferEncoding): ChatClientRequestSpec;
    user(text: Buffer): ChatClientRequestSpec;
    user(
      consumer: (promptUserSpec: PromptUserSpec) => void,
    ): ChatClientRequestSpec;
    templateRenderer(templateRenderer: TemplateRenderer): ChatClientRequestSpec;
    call(): CallResponseSpec;
    stream(): StreamResponseSpec;
  }

  export interface Builder {
    defaultAdvisors(...advisors: Advisor[]): Builder;
    defaultAdvisors(
      advisorSpecConsumer: (advisorSpec: AdvisorSpec) => void,
    ): Builder;
    defaultAdvisors(advisors: Advisor[]): Builder;
    defaultOptions(chatOptions: ChatOptions): Builder;
    defaultUser(text: string): Builder;
    defaultUser(text: Buffer, charset: BufferEncoding): Builder;
    defaultUser(text: Buffer): Builder;
    defaultUser(userSpecConsumer: (userSpec: PromptUserSpec) => void): Builder;
    defaultSystem(text: string): Builder;
    defaultSystem(text: Buffer, charset: BufferEncoding): Builder;
    defaultSystem(text: Buffer): Builder;
    defaultSystem(
      systemSpecConsumer: (systemSpec: PromptSystemSpec) => void,
    ): Builder;
    defaultTemplateRenderer(templateRenderer: TemplateRenderer): Builder;
    defaultToolNames(...toolNames: string[]): Builder;
    defaultTools(...toolObjects: unknown[]): Builder;
    defaultToolCallbacks(...toolCallbacks: ToolCallback[]): Builder;
    defaultToolCallbacks(toolCallbacks: ToolCallback[]): Builder;
    defaultToolCallbacks(
      ...toolCallbackProviders: ToolCallbackProvider[]
    ): Builder;
    defaultToolContext(toolContext: Map<string, unknown>): Builder;
    clone(): Builder;
    build(): ChatClient;
  }
}
