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
import {
  Media,
  type MimeType,
  type TemplateRenderer,
  TemplateRendererFactory,
} from "@nestjs-ai/commons";
import {
  type ChatModel,
  type ChatOptions,
  type ChatResponse,
  JsonSchemaOutputConverter,
  type Message,
  Prompt,
  StandardSchemaOutputConverter,
  StructuredOutputConverter,
  type ToolCallback,
  ToolCallbacks,
  type ToolObjectInstance,
} from "@nestjs-ai/model";
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { ObservationRegistry } from "@nestjs-port/core";
import { StringUtils } from "@nestjs-port/core";
import type { Observable } from "rxjs";
import { filter, map } from "rxjs";
import type {
  Advisor,
  AdvisorObservationConvention,
  BaseAdvisorChain,
} from "./advisor/index.js";
import {
  ChatModelCallAdvisor,
  ChatModelStreamAdvisor,
  DefaultAroundAdvisorChain,
} from "./advisor/index.js";
import { ChatClient } from "./chat-client.js";
import { ChatClientAttributes } from "./chat-client-attributes.js";
import { ChatClientMessageAggregator } from "./chat-client-message-aggregator.js";
import type { ChatClientRequest } from "./chat-client-request.js";
import { ChatClientResponse } from "./chat-client-response.js";
import type { DefaultChatClientBuilder } from "./default-chat-client-builder.js";
import { DefaultChatClientUtils } from "./default-chat-client-utils.js";
import {
  ChatClientObservationContext,
  type ChatClientObservationConvention,
  ChatClientObservationDocumentation,
  DefaultChatClientObservationConvention,
} from "./observation/index.js";
import { ResponseEntity } from "./response-entity.js";

type StandardSchemaWithJsonSchema = StandardSchemaV1 & StandardJSONSchemaV1;

export class DefaultChatClient implements ChatClient {
  private readonly _defaultChatClientRequest: DefaultChatClient.DefaultChatClientRequestSpec;

  constructor(
    defaultChatClientRequest: DefaultChatClient.DefaultChatClientRequestSpec,
  ) {
    assert(defaultChatClientRequest, "defaultChatClientRequest cannot be null");
    this._defaultChatClientRequest = defaultChatClientRequest;
  }

  prompt(): ChatClient.ChatClientRequestSpec;
  prompt(content: string): ChatClient.ChatClientRequestSpec;
  prompt(prompt: Prompt): ChatClient.ChatClientRequestSpec;
  prompt(
    props: ChatClient.ChatClientRequestProps,
  ): ChatClient.ChatClientRequestSpec;
  prompt(
    contentOrPromptOrProps?:
      | string
      | Prompt
      | ChatClient.ChatClientRequestProps,
  ): ChatClient.ChatClientRequestSpec {
    if (contentOrPromptOrProps == null) {
      return new DefaultChatClient.DefaultChatClientRequestSpec(
        this._defaultChatClientRequest,
      );
    }

    if (typeof contentOrPromptOrProps === "string") {
      assert(
        StringUtils.hasText(contentOrPromptOrProps),
        "content cannot be null or empty",
      );
      return this.prompt(new Prompt(contentOrPromptOrProps));
    }

    if (contentOrPromptOrProps instanceof Prompt) {
      const spec = new DefaultChatClient.DefaultChatClientRequestSpec(
        this._defaultChatClientRequest,
      );

      if (contentOrPromptOrProps.instructions != null) {
        spec.messages(contentOrPromptOrProps.instructions);
      }

      return spec;
    }

    const spec = new DefaultChatClient.DefaultChatClientRequestSpec(
      this._defaultChatClientRequest,
    );
    DefaultChatClient.applyChatClientRequestProps(spec, contentOrPromptOrProps);
    return spec;
  }

  mutate(): ChatClient.Builder {
    return this._defaultChatClientRequest.mutate();
  }
}

export namespace DefaultChatClient {
  const DEFAULT_CHAT_CLIENT_OBSERVATION_CONVENTION: ChatClientObservationConvention =
    new DefaultChatClientObservationConvention();

  const DEFAULT_TEMPLATE_RENDERER: TemplateRenderer =
    TemplateRendererFactory.getTemplateRenderer();

  const CHAT_CLIENT_MESSAGE_AGGREGATOR = new ChatClientMessageAggregator();

  export class DefaultPromptUserSpec implements ChatClient.PromptUserSpec {
    private readonly _params = new Map<string, unknown>();
    private readonly _metadata = new Map<string, unknown>();
    private readonly _media: Media[] = [];
    private _text: string | null = null;

    media(...media: Media[]): ChatClient.PromptUserSpec;
    media(mimeType: MimeType, url: URL): ChatClient.PromptUserSpec;
    media(mimeType: MimeType, resource: Buffer): ChatClient.PromptUserSpec;
    media(
      first: Media | MimeType,
      second?: Media | URL | Buffer,
      ...rest: Media[]
    ): ChatClient.PromptUserSpec {
      if (first === undefined && second === undefined && rest.length === 0) {
        return this;
      }

      if (typeof first === "string") {
        assert(second, "resource cannot be null");
        this._media.push(new Media({ mimeType: first, data: second }));
        return this;
      }

      const hasSecondArgument = second !== undefined || rest.length > 0;
      const allMedia = [
        first,
        ...(hasSecondArgument ? [second as Media] : []),
        ...rest,
      ];
      assert(
        allMedia.every((item) => item != null),
        "media cannot contain null elements",
      );
      this._media.push(...allMedia);
      return this;
    }

    text(text: string): ChatClient.PromptUserSpec;
    text(text: Buffer, charset: BufferEncoding): ChatClient.PromptUserSpec;
    text(text: Buffer): ChatClient.PromptUserSpec;
    text(
      textOrBuffer: string | Buffer,
      charset?: BufferEncoding,
    ): ChatClient.PromptUserSpec {
      if (typeof textOrBuffer === "string") {
        assert(
          StringUtils.hasText(textOrBuffer),
          "text cannot be null or empty",
        );
        this._text = textOrBuffer;
        return this;
      }

      assert(textOrBuffer, "text cannot be null");
      this._text = readBufferText(textOrBuffer, charset);
      return this;
    }

    param(k: string, v: unknown): ChatClient.PromptUserSpec {
      assert(StringUtils.hasText(k), "key cannot be null or empty");
      assert(v != null, "value cannot be null");
      this._params.set(k, v);
      return this;
    }

    params(p: Map<string, unknown>): ChatClient.PromptUserSpec {
      assert(p, "params cannot be null");
      for (const [key, value] of p.entries()) {
        assert(key != null, "param keys cannot contain null elements");
        assert(value != null, "param values cannot contain null elements");
        this._params.set(key, value);
      }
      return this;
    }

    metadata(metadata: Map<string, unknown>): ChatClient.PromptUserSpec;
    metadata(k: string, v: unknown): ChatClient.PromptUserSpec;
    metadata(
      metadataOrKey: Map<string, unknown> | string,
      value?: unknown,
    ): ChatClient.PromptUserSpec {
      if (typeof metadataOrKey === "string") {
        assert(
          StringUtils.hasText(metadataOrKey),
          "metadata key cannot be null or empty",
        );
        assert(value != null, "metadata value cannot be null");
        this._metadata.set(metadataOrKey, value);
        return this;
      }

      assert(metadataOrKey, "metadata cannot be null");
      for (const [key, metadataValue] of metadataOrKey.entries()) {
        assert(key != null, "metadata keys cannot contain null elements");
        assert(
          metadataValue != null,
          "metadata values cannot contain null elements",
        );
        this._metadata.set(key, metadataValue);
      }
      return this;
    }

    get textValue(): string | null {
      return this._text;
    }

    get paramsValue(): Map<string, unknown> {
      return this._params;
    }

    get mediaValue(): Media[] {
      return this._media;
    }

    get metadataValue(): Map<string, unknown> {
      return this._metadata;
    }
  }

  export class DefaultPromptSystemSpec implements ChatClient.PromptSystemSpec {
    private readonly _params = new Map<string, unknown>();
    private readonly _metadata = new Map<string, unknown>();
    private _text: string | null = null;

    text(text: string): ChatClient.PromptSystemSpec;
    text(text: Buffer, charset: BufferEncoding): ChatClient.PromptSystemSpec;
    text(text: Buffer): ChatClient.PromptSystemSpec;
    text(
      textOrBuffer: string | Buffer,
      charset?: BufferEncoding,
    ): ChatClient.PromptSystemSpec {
      if (typeof textOrBuffer === "string") {
        assert(
          StringUtils.hasText(textOrBuffer),
          "text cannot be null or empty",
        );
        this._text = textOrBuffer;
        return this;
      }

      assert(textOrBuffer, "text cannot be null");
      this._text = readBufferText(textOrBuffer, charset);
      return this;
    }

    param(k: string, v: unknown): ChatClient.PromptSystemSpec {
      assert(StringUtils.hasText(k), "key cannot be null or empty");
      assert(v != null, "value cannot be null");
      this._params.set(k, v);
      return this;
    }

    params(p: Map<string, unknown>): ChatClient.PromptSystemSpec {
      assert(p, "params cannot be null");
      for (const [key, value] of p.entries()) {
        assert(key != null, "param keys cannot contain null elements");
        assert(value != null, "param values cannot contain null elements");
        this._params.set(key, value);
      }
      return this;
    }

    metadata(metadata: Map<string, unknown>): ChatClient.PromptSystemSpec;
    metadata(k: string, v: unknown): ChatClient.PromptSystemSpec;
    metadata(
      metadataOrKey: Map<string, unknown> | string,
      value?: unknown,
    ): ChatClient.PromptSystemSpec {
      if (typeof metadataOrKey === "string") {
        assert(
          StringUtils.hasText(metadataOrKey),
          "metadata key cannot be null or empty",
        );
        assert(value != null, "metadata value cannot be null");
        this._metadata.set(metadataOrKey, value);
        return this;
      }

      assert(metadataOrKey, "metadata cannot be null");
      for (const [key, metadataValue] of metadataOrKey.entries()) {
        assert(key != null, "metadata keys cannot contain null elements");
        assert(
          metadataValue != null,
          "metadata values cannot contain null elements",
        );
        this._metadata.set(key, metadataValue);
      }
      return this;
    }

    get textValue(): string | null {
      return this._text;
    }

    get paramsValue(): Map<string, unknown> {
      return this._params;
    }

    get metadataValue(): Map<string, unknown> {
      return this._metadata;
    }
  }

  export class DefaultAdvisorSpec implements ChatClient.AdvisorSpec {
    private readonly _advisors: Advisor[] = [];
    private readonly _params = new Map<string, unknown>();

    param(k: string, v: unknown): ChatClient.AdvisorSpec {
      assert(StringUtils.hasText(k), "key cannot be null or empty");
      assert(v != null, "value cannot be null");
      this._params.set(k, v);
      return this;
    }

    params(p: Map<string, unknown>): ChatClient.AdvisorSpec {
      assert(p, "params cannot be null");
      for (const [key, value] of p.entries()) {
        assert(key != null, "param keys cannot contain null elements");
        assert(value != null, "param values cannot contain null elements");
        this._params.set(key, value);
      }
      return this;
    }

    advisors(...advisors: Advisor[]): ChatClient.AdvisorSpec;
    advisors(advisors: Advisor[]): ChatClient.AdvisorSpec;
    advisors(
      ...advisorsOrList: Advisor[] | [Advisor[]]
    ): ChatClient.AdvisorSpec {
      const advisors =
        advisorsOrList.length === 1 && Array.isArray(advisorsOrList[0])
          ? (advisorsOrList[0] as Advisor[])
          : (advisorsOrList as Advisor[]);
      assert(advisors, "advisors cannot be null");
      assert(
        advisors.every((advisor) => advisor != null),
        "advisors cannot contain null elements",
      );
      this._advisors.push(...advisors);
      return this;
    }

    get advisorsValue(): Advisor[] {
      return this._advisors;
    }

    get paramsValue(): Map<string, unknown> {
      return this._params;
    }
  }

  export class DefaultCallResponseSpec implements ChatClient.CallResponseSpec {
    private readonly _request: ChatClientRequest;
    private readonly _advisorChain: BaseAdvisorChain;
    private readonly _observationRegistry: ObservationRegistry;
    private readonly _observationConvention: ChatClientObservationConvention;

    constructor(
      chatClientRequest: ChatClientRequest,
      advisorChain: BaseAdvisorChain,
      observationRegistry: ObservationRegistry,
      observationConvention: ChatClientObservationConvention,
    ) {
      assert(chatClientRequest, "chatClientRequest cannot be null");
      assert(advisorChain, "advisorChain cannot be null");
      assert(observationRegistry, "observationRegistry cannot be null");
      assert(observationConvention, "observationConvention cannot be null");
      this._request = chatClientRequest;
      this._advisorChain = advisorChain;
      this._observationRegistry = observationRegistry;
      this._observationConvention = observationConvention;
    }

    responseEntity<T>(
      structuredOutputConverter: StructuredOutputConverter<T>,
    ): Promise<ResponseEntity<ChatResponse, T>>;

    responseEntity<TSchema extends StandardSchemaWithJsonSchema>(
      schema: TSchema,
    ): Promise<
      ResponseEntity<ChatResponse, StandardJSONSchemaV1.InferOutput<TSchema>>
    >;

    responseEntity<
      TSchema extends StandardSchemaWithJsonSchema,
      TOutput = StandardJSONSchemaV1.InferOutput<TSchema>,
    >(
      schema: TSchema,
      transformer?: (
        value: StandardJSONSchemaV1.InferOutput<TSchema>,
      ) => TOutput,
    ): Promise<ResponseEntity<ChatResponse, TOutput>>;

    responseEntity<TSchema extends JSONSchema, TOutput = FromSchema<TSchema>>(
      schema: TSchema,
      transformer?: (value: FromSchema<TSchema>) => TOutput,
    ): Promise<ResponseEntity<ChatResponse, TOutput>>;
    async responseEntity(
      schemaOrConverter:
        | StandardSchemaWithJsonSchema
        | JSONSchema
        | StructuredOutputConverter<unknown>,
      transformer?: (value: unknown) => unknown,
    ): Promise<ResponseEntity<ChatResponse, unknown>> {
      if (schemaOrConverter instanceof StructuredOutputConverter) {
        return await this.doResponseEntity(schemaOrConverter);
      }
      const converter = this.createStructuredOutputConverter(
        schemaOrConverter,
        transformer,
      );
      return await this.doResponseEntity(converter);
    }

    private async doResponseEntity<T>(
      outputConverter: StructuredOutputConverter<T>,
    ): Promise<ResponseEntity<ChatResponse, T>> {
      assert(outputConverter, "structuredOutputConverter cannot be null");
      const chatClientRequest = this.withOutputConverterContext(
        this._request,
        outputConverter,
        true,
      );
      const chatResponse = (
        await this.doGetObservableChatClientResponse(chatClientRequest)
      ).chatResponse;
      const responseContent =
        DefaultCallResponseSpec.getContentFromChatResponse(chatResponse);
      if (responseContent == null) {
        return new ResponseEntity<ChatResponse, T>(chatResponse, null);
      }
      const entity = await outputConverter.convert(responseContent);
      return new ResponseEntity<ChatResponse, T>(chatResponse, entity);
    }

    entity<T>(
      structuredOutputConverter: StructuredOutputConverter<T>,
    ): Promise<T | null>;

    entity<TSchema extends StandardSchemaWithJsonSchema>(
      schema: TSchema,
    ): Promise<StandardJSONSchemaV1.InferOutput<TSchema> | null>;

    entity<
      TSchema extends StandardSchemaWithJsonSchema,
      TOutput = StandardJSONSchemaV1.InferOutput<TSchema>,
    >(
      schema: TSchema,
      transformer?: (
        value: StandardJSONSchemaV1.InferOutput<TSchema>,
      ) => TOutput,
    ): Promise<TOutput | null>;

    entity<TSchema extends JSONSchema, TOutput = FromSchema<TSchema>>(
      schema: TSchema,
      transformer?: (value: FromSchema<TSchema>) => TOutput,
    ): Promise<TOutput | null>;
    async entity(
      schemaOrConverter:
        | StandardSchemaWithJsonSchema
        | JSONSchema
        | StructuredOutputConverter<unknown>,
      transformer?: (value: unknown) => unknown,
    ): Promise<unknown | null> {
      if (schemaOrConverter instanceof StructuredOutputConverter) {
        return this.doEntity(schemaOrConverter);
      }

      const converter = this.createStructuredOutputConverter(
        schemaOrConverter,
        transformer,
      );
      return this.doEntity(converter);
    }

    private createStructuredOutputConverter(
      schema: StandardSchemaWithJsonSchema | JSONSchema,
      transformer?: (value: unknown) => unknown,
    ): StructuredOutputConverter<unknown> {
      if (this.isStandardSchema(schema)) {
        return new StandardSchemaOutputConverter({
          schema,
          transformer,
        });
      }

      return new JsonSchemaOutputConverter({
        schema: schema as JSONSchema,
        transformer,
      } as any);
    }

    private isStandardSchema(
      value: StandardSchemaWithJsonSchema | JSONSchema,
    ): value is StandardSchemaWithJsonSchema {
      return (
        typeof value === "object" && value !== null && "~standard" in value
      );
    }

    private async doEntity<T>(
      outputConverter: StructuredOutputConverter<T>,
    ): Promise<T | null> {
      assert(outputConverter, "structuredOutputConverter cannot be null");
      const chatClientRequest = this.withOutputConverterContext(
        this._request,
        outputConverter,
        false,
      );
      const chatResponse = (
        await this.doGetObservableChatClientResponse(chatClientRequest)
      ).chatResponse;
      const stringResponse =
        DefaultCallResponseSpec.getContentFromChatResponse(chatResponse);
      if (stringResponse == null) {
        return null;
      }
      return outputConverter.convert(stringResponse);
    }

    private withOutputConverterContext<T>(
      chatClientRequest: ChatClientRequest,
      outputConverter: StructuredOutputConverter<T>,
      forceOutputFormat: boolean,
    ): ChatClientRequest {
      const context = chatClientRequest.context;
      if (forceOutputFormat || StringUtils.hasText(outputConverter.format)) {
        context.set(
          ChatClientAttributes.OUTPUT_FORMAT.key,
          outputConverter.format,
        );
      }

      if (
        context.get(ChatClientAttributes.STRUCTURED_OUTPUT_NATIVE.key) ===
          true &&
        (outputConverter instanceof JsonSchemaOutputConverter ||
          outputConverter instanceof StandardSchemaOutputConverter)
      ) {
        context.set(
          ChatClientAttributes.STRUCTURED_OUTPUT_SCHEMA.key,
          outputConverter.jsonSchema,
        );
      }

      return chatClientRequest.mutate().context(context).build();
    }

    private async doGetObservableChatClientResponse(
      chatClientRequest: ChatClientRequest,
    ): Promise<ChatClientResponse> {
      const outputFormat = chatClientRequest.context.get(
        ChatClientAttributes.OUTPUT_FORMAT.key,
      );
      const observationContext = ChatClientObservationContext.builder()
        .request(chatClientRequest)
        .advisors(this._advisorChain.callAdvisors)
        .stream(false)
        .format(typeof outputFormat === "string" ? outputFormat : null)
        .build();

      const observation = new ChatClientObservationDocumentation().observation(
        this._observationConvention,
        DEFAULT_CHAT_CLIENT_OBSERVATION_CONVENTION,
        () => observationContext,
        this._observationRegistry,
      );

      const chatClientResponse = await observation.observe(async () => {
        const response = await this._advisorChain.nextCall(chatClientRequest);
        observationContext.setResponse(response);
        return response;
      });

      return chatClientResponse ?? ChatClientResponse.builder().build();
    }

    async chatClientResponse(): Promise<ChatClientResponse> {
      return this.doGetObservableChatClientResponse(this._request);
    }

    async chatResponse(): Promise<ChatResponse | null> {
      return (await this.doGetObservableChatClientResponse(this._request))
        .chatResponse;
    }

    async content(): Promise<string | null> {
      const chatResponse = await this.chatResponse();
      return DefaultCallResponseSpec.getContentFromChatResponse(chatResponse);
    }

    static getContentFromChatResponse(
      chatResponse: ChatResponse | null,
    ): string | null {
      return chatResponse?.result?.output?.text ?? null;
    }
  }

  export class DefaultStreamResponseSpec
    implements ChatClient.StreamResponseSpec
  {
    private readonly _request: ChatClientRequest;
    private readonly _advisorChain: BaseAdvisorChain;
    private readonly _observationRegistry: ObservationRegistry;
    private readonly _observationConvention: ChatClientObservationConvention;

    constructor(
      chatClientRequest: ChatClientRequest,
      advisorChain: BaseAdvisorChain,
      observationRegistry: ObservationRegistry,
      observationConvention: ChatClientObservationConvention,
    ) {
      assert(chatClientRequest, "chatClientRequest cannot be null");
      assert(advisorChain, "advisorChain cannot be null");
      assert(observationRegistry, "observationRegistry cannot be null");
      assert(observationConvention, "observationConvention cannot be null");
      this._request = chatClientRequest;
      this._advisorChain = advisorChain;
      this._observationRegistry = observationRegistry;
      this._observationConvention = observationConvention;
    }

    private doGetObservableFluxChatResponse(
      chatClientRequest: ChatClientRequest,
    ): Observable<ChatClientResponse> {
      const observationContext = ChatClientObservationContext.builder()
        .request(chatClientRequest)
        .advisors(this._advisorChain.streamAdvisors)
        .stream(true)
        .build();

      const observation = new ChatClientObservationDocumentation().observation(
        this._observationConvention,
        DEFAULT_CHAT_CLIENT_OBSERVATION_CONVENTION,
        () => observationContext,
        this._observationRegistry,
      );

      const chatClientResponse = observation.observeStream(() =>
        this._advisorChain.nextStream(chatClientRequest),
      );

      return CHAT_CLIENT_MESSAGE_AGGREGATOR.aggregateChatClientResponse(
        chatClientResponse,
        (aggregated) => {
          observationContext.setResponse(aggregated);
        },
      );
    }

    chatClientResponse(): Observable<ChatClientResponse> {
      return this.doGetObservableFluxChatResponse(this._request);
    }

    chatResponse(): Observable<ChatResponse> {
      return this.doGetObservableFluxChatResponse(this._request).pipe(
        map((response) => response.chatResponse),
        filter(
          (chatResponse): chatResponse is ChatResponse => chatResponse != null,
        ),
      );
    }

    content(): Observable<string> {
      return this.chatResponse().pipe(
        map((response) => response.result?.output?.text ?? ""),
        filter((value) => value.length > 0),
      );
    }

    chatClientResponseIterable(): AsyncIterable<ChatClientResponse> {
      return eachValueFrom(this.chatClientResponse());
    }

    chatResponseIterable(): AsyncIterable<ChatResponse> {
      return eachValueFrom(this.chatResponse());
    }

    contentIterable(): AsyncIterable<string> {
      return eachValueFrom(this.content());
    }
  }

  export class DefaultChatClientRequestSpec
    implements ChatClient.ChatClientRequestSpec
  {
    private readonly _observationRegistry: ObservationRegistry;
    private readonly _chatClientObservationConvention: ChatClientObservationConvention;
    private readonly _advisorObservationConvention: AdvisorObservationConvention | null;
    private readonly _chatModel: ChatModel;
    private readonly _media: Media[] = [];
    private readonly _toolNames: string[] = [];
    private readonly _toolCallbacks: ToolCallback[] = [];
    private readonly _toolCallbackProviders: ChatClient.ToolCallbackProvider[] =
      [];
    private readonly _messages: Message[] = [];
    private readonly _userParams: Record<string, unknown> = {};
    private readonly _userMetadata: Record<string, unknown> = {};
    private readonly _systemParams: Record<string, unknown> = {};
    private readonly _systemMetadata: Record<string, unknown> = {};
    private readonly _advisors: Advisor[] = [];
    private readonly _advisorParams: Record<string, unknown> = {};
    private readonly _toolContext: Record<string, unknown> = {};
    private _templateRenderer: TemplateRenderer;
    private _userText: string | null;
    private _systemText: string | null;
    private _optionsCustomizer: ChatOptions.Builder | null;

    constructor(ccr: DefaultChatClientRequestSpec);
    constructor(
      chatModel: ChatModel,
      userText: string | null,
      userParams: Record<string, unknown>,
      userMetadata: Record<string, unknown>,
      systemText: string | null,
      systemParams: Record<string, unknown>,
      systemMetadata: Record<string, unknown>,
      toolCallbacks: ToolCallback[],
      toolCallbackProviders: ChatClient.ToolCallbackProvider[],
      messages: Message[],
      toolNames: string[],
      media: Media[],
      optionsCustomizer: ChatOptions.Builder | null,
      advisors: Advisor[],
      advisorParams: Record<string, unknown>,
      observationRegistry: ObservationRegistry,
      chatClientObservationConvention: ChatClientObservationConvention | null,
      toolContext: Record<string, unknown>,
      templateRenderer: TemplateRenderer | null,
      advisorObservationConvention: AdvisorObservationConvention | null,
    );
    constructor(
      chatModelOrSpec: ChatModel | DefaultChatClientRequestSpec,
      userText?: string | null,
      userParams?: Record<string, unknown>,
      userMetadata?: Record<string, unknown>,
      systemText?: string | null,
      systemParams?: Record<string, unknown>,
      systemMetadata?: Record<string, unknown>,
      toolCallbacks?: ToolCallback[],
      toolCallbackProviders?: ChatClient.ToolCallbackProvider[],
      messages?: Message[],
      toolNames?: string[],
      media?: Media[],
      optionsCustomizer?: ChatOptions.Builder | null,
      advisors?: Advisor[],
      advisorParams?: Record<string, unknown>,
      observationRegistry?: ObservationRegistry,
      chatClientObservationConvention?: ChatClientObservationConvention | null,
      toolContext?: Record<string, unknown>,
      templateRenderer?: TemplateRenderer | null,
      advisorObservationConvention?: AdvisorObservationConvention | null,
    ) {
      if (chatModelOrSpec instanceof DefaultChatClientRequestSpec) {
        const ccr = chatModelOrSpec;
        this._chatModel = ccr._chatModel;
        this._optionsCustomizer = ccr._optionsCustomizer?.clone() ?? null;
        this._userText = ccr._userText;
        this._userParams = { ...ccr._userParams };
        this._userMetadata = { ...ccr._userMetadata };
        this._systemText = ccr._systemText;
        this._systemParams = { ...ccr._systemParams };
        this._systemMetadata = { ...ccr._systemMetadata };
        this._toolNames.push(...ccr._toolNames);
        this._toolCallbacks.push(...ccr._toolCallbacks);
        this._toolCallbackProviders.push(...ccr._toolCallbackProviders);
        this._messages.push(...ccr._messages);
        this._media.push(...ccr._media);
        this._advisors.push(...ccr._advisors);
        this._advisorParams = { ...ccr._advisorParams };
        this._observationRegistry = ccr._observationRegistry;
        this._chatClientObservationConvention =
          ccr._chatClientObservationConvention;
        this._toolContext = { ...ccr._toolContext };
        this._templateRenderer = ccr._templateRenderer;
        this._advisorObservationConvention = ccr._advisorObservationConvention;
        return;
      }

      const chatModel = chatModelOrSpec;
      assert(chatModel, "chatModel cannot be null");
      assert(userParams, "userParams cannot be null");
      assert(userMetadata, "userMetadata cannot be null");
      assert(systemParams, "systemParams cannot be null");
      assert(systemMetadata, "systemMetadata cannot be null");
      assert(toolCallbacks, "toolCallbacks cannot be null");
      assert(toolCallbackProviders, "toolCallbackProviders cannot be null");
      assert(messages, "messages cannot be null");
      assert(toolNames, "toolNames cannot be null");
      assert(media, "media cannot be null");
      assert(advisors, "advisors cannot be null");
      assert(advisorParams, "advisorParams cannot be null");
      assert(observationRegistry, "observationRegistry cannot be null");
      assert(toolContext, "toolContext cannot be null");

      this._chatModel = chatModel;
      this._optionsCustomizer = optionsCustomizer?.clone() ?? null;
      this._userText = userText ?? null;
      this._userParams = { ...userParams };
      this._userMetadata = { ...userMetadata };
      this._systemText = systemText ?? null;
      this._systemParams = { ...systemParams };
      this._systemMetadata = { ...systemMetadata };
      this._toolNames.push(...toolNames);
      this._toolCallbacks.push(...toolCallbacks);
      this._toolCallbackProviders.push(...toolCallbackProviders);
      this._messages.push(...messages);
      this._media.push(...media);
      this._advisors.push(...advisors);
      this._advisorParams = { ...advisorParams };
      this._observationRegistry = observationRegistry;
      this._chatClientObservationConvention =
        chatClientObservationConvention ??
        DEFAULT_CHAT_CLIENT_OBSERVATION_CONVENTION;
      this._toolContext = { ...toolContext };
      this._templateRenderer = templateRenderer ?? DEFAULT_TEMPLATE_RENDERER;
      this._advisorObservationConvention = advisorObservationConvention ?? null;
    }

    get userText(): string | null {
      return this._userText;
    }

    get userParams(): Record<string, unknown> {
      return this._userParams;
    }

    get userMetadata(): Record<string, unknown> {
      return this._userMetadata;
    }

    get systemText(): string | null {
      return this._systemText;
    }

    get systemParams(): Record<string, unknown> {
      return this._systemParams;
    }

    get systemMetadata(): Record<string, unknown> {
      return this._systemMetadata;
    }

    get chatModel(): ChatModel {
      return this._chatModel;
    }

    get chatOptionsCustomizer(): ChatOptions.Builder | null {
      return this._optionsCustomizer;
    }

    getAdvisors(): Advisor[] {
      return this._advisors;
    }

    get advisorParams(): Record<string, unknown> {
      return this._advisorParams;
    }

    getMessages(): Message[] {
      return this._messages;
    }

    get media(): Media[] {
      return this._media;
    }

    getToolNames(): string[] {
      return this._toolNames;
    }

    getToolCallbacks(): ToolCallback[] {
      return this._toolCallbacks;
    }

    get toolCallbackProviders(): ChatClient.ToolCallbackProvider[] {
      return this._toolCallbackProviders;
    }

    getToolContext(): Record<string, unknown> {
      return this._toolContext;
    }

    getTemplateRenderer(): TemplateRenderer {
      return this._templateRenderer;
    }

    mutate(): ChatClient.Builder {
      const builder = ChatClient.builder(
        this._chatModel,
        this._observationRegistry,
        this._chatClientObservationConvention,
        this._advisorObservationConvention,
      );

      builder
        .defaultTemplateRenderer(this._templateRenderer)
        .defaultToolCallbacks(this._toolCallbacks)
        .defaultToolCallbacks(...this._toolCallbackProviders)
        .defaultToolContext(new Map(Object.entries(this._toolContext)))
        .defaultToolNames(...this._toolNames);

      if (this._advisors.length > 0) {
        builder.defaultAdvisors((a) =>
          a
            .advisors(this._advisors)
            .params(new Map(Object.entries(this._advisorParams))),
        );
      }

      if (StringUtils.hasText(this._userText)) {
        const text = this._userText;
        builder.defaultUser((u) =>
          u
            .text(text)
            .params(new Map(Object.entries(this._userParams)))
            .media(...this._media)
            .metadata(new Map(Object.entries(this._userMetadata))),
        );
      }

      if (StringUtils.hasText(this._systemText)) {
        const text = this._systemText;
        builder.defaultSystem((s) =>
          s
            .text(text)
            .params(new Map(Object.entries(this._systemParams)))
            .metadata(new Map(Object.entries(this._systemMetadata))),
        );
      }

      if (this._optionsCustomizer != null) {
        builder.defaultOptions(this._optionsCustomizer);
      }

      (builder as DefaultChatClientBuilder).addMessages(this._messages);
      return builder;
    }

    advisors(
      consumerOrAdvisor:
        | ((advisorSpec: ChatClient.AdvisorSpec) => void)
        | Advisor,
      ...rest: Advisor[]
    ): ChatClient.ChatClientRequestSpec;
    advisors(advisors: Advisor[]): ChatClient.ChatClientRequestSpec;
    advisors(
      consumerOrAdvisorOrAdvisors:
        | ((advisorSpec: ChatClient.AdvisorSpec) => void)
        | Advisor
        | Advisor[],
      ...rest: Advisor[]
    ): ChatClient.ChatClientRequestSpec {
      if (typeof consumerOrAdvisorOrAdvisors === "function") {
        const advisorSpec = new DefaultAdvisorSpec();
        consumerOrAdvisorOrAdvisors(advisorSpec);
        Object.assign(
          this._advisorParams,
          Object.fromEntries(advisorSpec.paramsValue.entries()),
        );
        this._advisors.push(...advisorSpec.advisorsValue);
        return this;
      }

      const advisors = Array.isArray(consumerOrAdvisorOrAdvisors)
        ? consumerOrAdvisorOrAdvisors
        : [consumerOrAdvisorOrAdvisors, ...rest];
      assert(advisors, "advisors cannot be null");
      assert(
        advisors.every((advisor) => advisor != null),
        "advisors cannot contain null elements",
      );
      this._advisors.push(...advisors);
      return this;
    }

    messages(...messages: Message[]): ChatClient.ChatClientRequestSpec;
    messages(messages: Message[]): ChatClient.ChatClientRequestSpec;
    messages(
      messagesOrFirst: Message | Message[],
      ...rest: Message[]
    ): ChatClient.ChatClientRequestSpec {
      const messages = Array.isArray(messagesOrFirst)
        ? messagesOrFirst
        : [messagesOrFirst, ...rest];
      assert(messages, "messages cannot be null");
      assert(
        messages.every((message) => message != null),
        "messages cannot contain null elements",
      );
      this._messages.push(...messages);
      return this;
    }

    options<T extends ChatOptions.Builder>(
      optionsCustomizer: T,
    ): ChatClient.ChatClientRequestSpec {
      assert(optionsCustomizer, "customizer cannot be null");
      this._optionsCustomizer = optionsCustomizer;
      return this;
    }

    toolNames(...toolNames: string[]): ChatClient.ChatClientRequestSpec {
      assert(toolNames, "toolNames cannot be null");
      assert(
        toolNames.every((toolName) => toolName != null),
        "toolNames cannot contain null elements",
      );
      this._toolNames.push(...toolNames);
      return this;
    }

    toolCallbacks(
      ...toolCallbacksOrProviders:
        | ToolCallback[]
        | ChatClient.ToolCallbackProvider[]
        | [ToolCallback[]]
    ): ChatClient.ChatClientRequestSpec {
      assert(toolCallbacksOrProviders, "toolCallbacks cannot be null");
      const first = toolCallbacksOrProviders[0];

      if (
        toolCallbacksOrProviders.length === 1 &&
        Array.isArray(first) &&
        first.length > 0 &&
        "toolDefinition" in first[0]
      ) {
        const callbacks = first as ToolCallback[];
        assert(
          callbacks.every((callback) => callback != null),
          "toolCallbacks cannot contain null elements",
        );
        this._toolCallbacks.push(...callbacks);
        return this;
      }

      const values = toolCallbacksOrProviders as (
        | ToolCallback
        | ChatClient.ToolCallbackProvider
      )[];
      assert(
        values.every((value) => value != null),
        "toolCallbacks cannot contain null elements",
      );

      if (values.length > 0 && "toolCallbacks" in values[0]) {
        this._toolCallbackProviders.push(
          ...(values as ChatClient.ToolCallbackProvider[]),
        );
        return this;
      }

      this._toolCallbacks.push(...(values as ToolCallback[]));
      return this;
    }

    tools(
      ...toolObjects: ToolObjectInstance[]
    ): ChatClient.ChatClientRequestSpec {
      assert(toolObjects, "toolObjects cannot be null");
      assert(
        toolObjects.every((toolObject) => toolObject != null),
        "toolObjects cannot contain null elements",
      );
      this._toolCallbacks.push(...ToolCallbacks.from(toolObjects));
      return this;
    }

    toolContext(
      toolContext: Map<string, unknown>,
    ): ChatClient.ChatClientRequestSpec;
    toolContext(
      toolContext: Record<string, unknown>,
    ): ChatClient.ChatClientRequestSpec;
    toolContext(
      toolContext: Map<string, unknown> | Record<string, unknown>,
    ): ChatClient.ChatClientRequestSpec {
      assert(toolContext, "toolContext cannot be null");
      const entries =
        toolContext instanceof Map
          ? [...toolContext.entries()]
          : Object.entries(toolContext);
      for (const [key, value] of entries) {
        assert(key != null, "toolContext keys cannot contain null elements");
        assert(
          value != null,
          "toolContext values cannot contain null elements",
        );
        this._toolContext[key] = value;
      }
      return this;
    }

    system(text: string): ChatClient.ChatClientRequestSpec;
    system(
      textResource: Buffer,
      charset: BufferEncoding,
    ): ChatClient.ChatClientRequestSpec;
    system(text: Buffer): ChatClient.ChatClientRequestSpec;
    system(
      consumer: (promptSystemSpec: ChatClient.PromptSystemSpec) => void,
    ): ChatClient.ChatClientRequestSpec;
    system(
      textOrConsumerOrResource:
        | string
        | Buffer
        | ((promptSystemSpec: ChatClient.PromptSystemSpec) => void),
      charset?: BufferEncoding,
    ): ChatClient.ChatClientRequestSpec {
      if (typeof textOrConsumerOrResource === "function") {
        const systemSpec = new DefaultPromptSystemSpec();
        textOrConsumerOrResource(systemSpec);
        this._systemText = StringUtils.hasText(systemSpec.textValue)
          ? systemSpec.textValue
          : this._systemText;
        Object.assign(
          this._systemParams,
          Object.fromEntries(systemSpec.paramsValue.entries()),
        );
        Object.assign(
          this._systemMetadata,
          Object.fromEntries(systemSpec.metadataValue.entries()),
        );
        return this;
      }

      if (typeof textOrConsumerOrResource === "string") {
        assert(
          StringUtils.hasText(textOrConsumerOrResource),
          "text cannot be null or empty",
        );
        this._systemText = textOrConsumerOrResource;
        return this;
      }

      assert(textOrConsumerOrResource, "text cannot be null");
      this._systemText = readBufferText(textOrConsumerOrResource, charset);
      return this;
    }

    user(text: string): ChatClient.ChatClientRequestSpec;
    user(
      text: Buffer,
      charset: BufferEncoding,
    ): ChatClient.ChatClientRequestSpec;
    user(text: Buffer): ChatClient.ChatClientRequestSpec;
    user(
      consumer: (promptUserSpec: ChatClient.PromptUserSpec) => void,
    ): ChatClient.ChatClientRequestSpec;
    user(
      textOrConsumerOrResource:
        | string
        | Buffer
        | ((promptUserSpec: ChatClient.PromptUserSpec) => void),
      charset?: BufferEncoding,
    ): ChatClient.ChatClientRequestSpec {
      if (typeof textOrConsumerOrResource === "function") {
        const userSpec = new DefaultPromptUserSpec();
        textOrConsumerOrResource(userSpec);
        this._userText = StringUtils.hasText(userSpec.textValue)
          ? userSpec.textValue
          : this._userText;
        Object.assign(
          this._userParams,
          Object.fromEntries(userSpec.paramsValue.entries()),
        );
        this._media.push(...userSpec.mediaValue);
        Object.assign(
          this._userMetadata,
          Object.fromEntries(userSpec.metadataValue.entries()),
        );
        return this;
      }

      if (typeof textOrConsumerOrResource === "string") {
        assert(
          StringUtils.hasText(textOrConsumerOrResource),
          "text cannot be null or empty",
        );
        this._userText = textOrConsumerOrResource;
        return this;
      }

      assert(textOrConsumerOrResource, "text cannot be null");
      this._userText = readBufferText(textOrConsumerOrResource, charset);
      return this;
    }

    templateRenderer(
      templateRenderer: TemplateRenderer,
    ): ChatClient.ChatClientRequestSpec {
      assert(templateRenderer, "templateRenderer cannot be null");
      this._templateRenderer = templateRenderer;
      return this;
    }

    call(): ChatClient.CallResponseSpec {
      const advisorChain = this.buildAdvisorChain();
      return new DefaultCallResponseSpec(
        DefaultChatClientUtils.toChatClientRequest(this),
        advisorChain,
        this._observationRegistry,
        this._chatClientObservationConvention,
      );
    }

    stream(): ChatClient.StreamResponseSpec {
      const advisorChain = this.buildAdvisorChain();
      return new DefaultStreamResponseSpec(
        DefaultChatClientUtils.toChatClientRequest(this),
        advisorChain,
        this._observationRegistry,
        this._chatClientObservationConvention,
      );
    }

    private buildAdvisorChain(): BaseAdvisorChain {
      this._advisors.push(new ChatModelCallAdvisor(this._chatModel));
      this._advisors.push(new ChatModelStreamAdvisor(this._chatModel));

      return DefaultAroundAdvisorChain.builder(this._observationRegistry)
        .observationConvention(this._advisorObservationConvention)
        .pushAll(this._advisors)
        .build();
    }
  }

  export function applyChatClientRequestProps(
    spec: ChatClient.ChatClientRequestSpec,
    props: ChatClient.ChatClientRequestProps,
  ): void {
    if (props.system != null) {
      applySystemProps(spec, props.system);
    }
    if (props.messages != null && props.messages.length > 0) {
      spec.messages(props.messages);
    }
    if (props.user != null) {
      applyUserProps(spec, props.user);
    }
    if (props.advisors != null) {
      applyAdvisorProps(spec, props.advisors);
    }
    if (props.tools != null && props.tools.length > 0) {
      spec.tools(...props.tools);
    }
    if (props.toolCallbacks != null && props.toolCallbacks.length > 0) {
      spec.toolCallbacks(...(props.toolCallbacks as ToolCallback[]));
    }
    if (props.toolNames != null && props.toolNames.length > 0) {
      spec.toolNames(...props.toolNames);
    }
    if (props.toolContext != null) {
      spec.toolContext(toParamsMap(props.toolContext));
    }
    if (props.options != null) {
      spec.options(props.options);
    }
    if (props.templateRenderer != null) {
      spec.templateRenderer(props.templateRenderer);
    }
  }

  function applySystemProps(
    spec: ChatClient.ChatClientRequestSpec,
    system: string | Buffer | ChatClient.ChatClientRequestSystemProps,
  ): void {
    if (typeof system === "string") {
      spec.system(system);
      return;
    }
    if (Buffer.isBuffer(system)) {
      spec.system(system);
      return;
    }
    spec.system((s) => {
      applySystemSpecProps(s, system);
    });
  }

  function applySystemSpecProps(
    s: ChatClient.PromptSystemSpec,
    system: ChatClient.ChatClientRequestSystemProps,
  ): void {
    if (typeof system.text === "string") {
      s.text(system.text);
    } else if (system.charset != null) {
      s.text(system.text, system.charset);
    } else {
      s.text(system.text);
    }
    if (system.params != null) {
      s.params(toParamsMap(system.params));
    }
    if (system.metadata != null) {
      s.metadata(toParamsMap(system.metadata));
    }
  }

  function applyUserProps(
    spec: ChatClient.ChatClientRequestSpec,
    user: string | Buffer | ChatClient.ChatClientRequestUserProps,
  ): void {
    if (typeof user === "string") {
      spec.user(user);
      return;
    }
    if (Buffer.isBuffer(user)) {
      spec.user(user);
      return;
    }
    spec.user((u) => {
      applyUserSpecProps(u, user);
    });
  }

  function applyUserSpecProps(
    u: ChatClient.PromptUserSpec,
    user: ChatClient.ChatClientRequestUserProps,
  ): void {
    if (typeof user.text === "string") {
      u.text(user.text);
    } else if (user.charset != null) {
      u.text(user.text, user.charset);
    } else {
      u.text(user.text);
    }
    if (user.params != null) {
      u.params(toParamsMap(user.params));
    }
    if (user.media != null && user.media.length > 0) {
      u.media(...user.media);
    }
    if (user.metadata != null) {
      u.metadata(toParamsMap(user.metadata));
    }
  }

  function applyAdvisorProps(
    spec: ChatClient.ChatClientRequestSpec,
    advisors: Advisor[] | ChatClient.ChatClientRequestAdvisorProps,
  ): void {
    if (Array.isArray(advisors)) {
      if (advisors.length > 0) {
        spec.advisors(advisors);
      }
      return;
    }
    spec.advisors((a) => {
      if (advisors.advisors != null && advisors.advisors.length > 0) {
        a.advisors(advisors.advisors);
      }
      if (advisors.params != null) {
        a.params(toParamsMap(advisors.params));
      }
    });
  }

  function toParamsMap(
    value: ChatClient.ChatClientRequestPropsParams,
  ): Map<string, unknown> {
    return value instanceof Map ? value : new Map(Object.entries(value));
  }
}

function readBufferText(
  text: Buffer,
  charset: BufferEncoding | undefined,
): string {
  assert(charset !== null, "charset cannot be null");
  return text.toString(charset ?? "utf-8");
}

async function* eachValueFrom<T>(
  source: Observable<T>,
): AsyncGenerator<T, void, void> {
  const pending: {
    resolve: (result: IteratorResult<T>) => void;
    reject: (reason: unknown) => void;
  }[] = [];
  const buffer: T[] = [];
  let completed = false;
  let hasError = false;
  let error: unknown = null;

  const subscription = source.subscribe({
    next(value) {
      const waiter = pending.shift();
      if (waiter) {
        waiter.resolve({ value, done: false });
      } else {
        buffer.push(value);
      }
    },
    error(err) {
      hasError = true;
      error = err;
      while (pending.length > 0) {
        pending.shift()?.reject(err);
      }
    },
    complete() {
      completed = true;
      while (pending.length > 0) {
        pending.shift()?.resolve({
          value: undefined as never,
          done: true,
        });
      }
    },
  });

  try {
    while (true) {
      if (buffer.length > 0) {
        yield buffer.shift() as T;
      } else if (completed) {
        return;
      } else if (hasError) {
        throw error;
      } else {
        const result = await new Promise<IteratorResult<T>>(
          (resolve, reject) => {
            pending.push({ resolve, reject });
          },
        );
        if (result.done) {
          return;
        }
        yield result.value;
      }
    }
  } finally {
    subscription.unsubscribe();
  }
}
