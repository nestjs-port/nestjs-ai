/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import assert from "node:assert/strict";
import type { Media, MimeType, TemplateRenderer } from "@nestjs-ai/commons";
import type {
  ChatModel,
  ChatOptions,
  ChatResponse,
  JsonOrJsonArraySchema,
  Message,
  OutputTypeTarget,
  Prompt,
  SchemaOutput,
  StructuredOutputConverter,
  ToolCallback,
  ToolObjectInstance,
} from "@nestjs-ai/model";
import {
  NoopObservationRegistry,
  type ObservationRegistry,
} from "@nestjs-port/core";
import type { Observable } from "rxjs";
import type { Advisor, AdvisorObservationConvention } from "./advisor/index.js";
import type { ChatClientResponse } from "./chat-client-response.js";
import { DefaultChatClientBuilder } from "./default-chat-client-builder.js";
import type { ChatClientObservationConvention } from "./observation/index.js";
import type { ResponseEntity } from "./response-entity.js";

export interface ChatClient {
  prompt(): ChatClient.ChatClientRequestSpec;

  prompt(content: string): ChatClient.ChatClientRequestSpec;

  prompt(prompt: Prompt): ChatClient.ChatClientRequestSpec;

  prompt(
    props: ChatClient.ChatClientRequestProps,
  ): ChatClient.ChatClientRequestSpec;

  mutate(): ChatClient.Builder;
}

export namespace ChatClient {
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
    entity<T>(
      structuredOutputConverter: StructuredOutputConverter<T>,
    ): Promise<T | null>;

    entity<TSchema extends JsonOrJsonArraySchema>(
      schema: TSchema,
      outputType?: Type<OutputTypeTarget<TSchema>>,
    ): Promise<SchemaOutput<TSchema> | null>;

    chatClientResponse(): Promise<ChatClientResponse>;

    chatResponse(): Promise<ChatResponse | null>;

    content(): Promise<string | null>;

    responseEntity<T>(
      structuredOutputConverter: StructuredOutputConverter<T>,
    ): Promise<ResponseEntity<ChatResponse, T>>;

    responseEntity<TSchema extends JsonOrJsonArraySchema>(
      schema: TSchema,
      outputType?: Type<OutputTypeTarget<TSchema>>,
    ): Promise<ResponseEntity<ChatResponse, SchemaOutput<TSchema>>>;
  }

  export interface StreamResponseSpec {
    chatClientResponse(): Observable<ChatClientResponse>;

    chatResponse(): Observable<ChatResponse>;

    content(): Observable<string>;

    chatClientResponseIterable(): AsyncIterable<ChatClientResponse>;

    chatResponseIterable(): AsyncIterable<ChatResponse>;

    contentIterable(): AsyncIterable<string>;
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

    options<T extends ChatOptions.Builder>(
      optionsCustomizer: T,
    ): ChatClientRequestSpec;

    toolNames(...toolNames: string[]): ChatClientRequestSpec;

    tools(...toolObjects: ToolObjectInstance[]): ChatClientRequestSpec;

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

  export type ChatClientRequestPropsParams =
    | Map<string, unknown>
    | Record<string, unknown>;

  export interface ChatClientRequestUserProps {
    text: string | Buffer;
    charset?: BufferEncoding;
    params?: ChatClientRequestPropsParams;
    metadata?: ChatClientRequestPropsParams;
    media?: Media[];
  }

  export interface ChatClientRequestSystemProps {
    text: string | Buffer;
    charset?: BufferEncoding;
    params?: ChatClientRequestPropsParams;
    metadata?: ChatClientRequestPropsParams;
  }

  export interface ChatClientRequestAdvisorProps {
    advisors?: Advisor[];
    params?: ChatClientRequestPropsParams;
  }

  export interface ChatClientRequestProps {
    user?: string | Buffer | ChatClientRequestUserProps;
    system?: string | Buffer | ChatClientRequestSystemProps;
    messages?: Message[];
    advisors?: Advisor[] | ChatClientRequestAdvisorProps;
    tools?: ToolObjectInstance[];
    toolCallbacks?: ToolCallback[] | ToolCallbackProvider[];
    toolNames?: string[];
    toolContext?: ChatClientRequestPropsParams;
    options?: ChatOptions.Builder;
    templateRenderer?: TemplateRenderer;
  }

  export interface Builder {
    defaultAdvisors(...advisors: Advisor[]): Builder;

    defaultAdvisors(
      advisorSpecConsumer: (advisorSpec: AdvisorSpec) => void,
    ): Builder;

    defaultAdvisors(advisors: Advisor[]): Builder;

    defaultOptions<T extends ChatOptions.Builder>(
      optionsCustomizer: T,
    ): Builder;

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

    defaultTools(...toolObjects: ToolObjectInstance[]): Builder;

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
