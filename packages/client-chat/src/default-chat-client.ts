import assert from "node:assert/strict";
import {
  Media,
  type MimeType,
  type ObservationRegistry,
  StringUtils,
  type TemplateRenderer,
} from "@nestjs-ai/commons";
import {
  BeanOutputConverter,
  type ChatModel,
  type ChatOptions,
  type ChatResponse,
  type Message,
  Prompt,
  type StructuredOutputConverter,
  type ToolCallback,
} from "@nestjs-ai/model";
import { StTemplateRenderer } from "@nestjs-ai/template-st";
import type { Observable } from "rxjs";
import { filter, map } from "rxjs";
import type {
  Advisor,
  AdvisorObservationConvention,
  BaseAdvisorChain,
} from "./advisor";
import {
  ChatModelCallAdvisor,
  ChatModelStreamAdvisor,
  DefaultAroundAdvisorChain,
} from "./advisor";
import { ChatClient } from "./chat-client";
import { ChatClientAttributes } from "./chat-client-attributes";
import { ChatClientMessageAggregator } from "./chat-client-message-aggregator";
import type { ChatClientRequest } from "./chat-client-request";
import { ChatClientResponse } from "./chat-client-response";
import { DefaultChatClientUtils } from "./default-chat-client-utils";
import {
  ChatClientObservationContext,
  type ChatClientObservationConvention,
  ChatClientObservationDocumentation,
  DefaultChatClientObservationConvention,
} from "./observation";
import { ResponseEntity } from "./response-entity";

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
  prompt(contentOrPrompt?: string | Prompt): ChatClient.ChatClientRequestSpec {
    if (contentOrPrompt == null) {
      return new DefaultChatClient.DefaultChatClientRequestSpec(
        this._defaultChatClientRequest,
      );
    }

    if (typeof contentOrPrompt === "string") {
      assert(
        StringUtils.hasText(contentOrPrompt),
        "content cannot be null or empty",
      );
      return this.prompt(new Prompt(contentOrPrompt));
    }

    assert(contentOrPrompt, "prompt cannot be null");
    const spec = new DefaultChatClient.DefaultChatClientRequestSpec(
      this._defaultChatClientRequest,
    );

    if (contentOrPrompt.options != null) {
      spec.options(contentOrPrompt.options as ChatOptions);
    }

    if (contentOrPrompt.instructions != null) {
      spec.messages(contentOrPrompt.instructions);
    }

    return spec;
  }

  mutate(): ChatClient.Builder {
    return this._defaultChatClientRequest.mutate();
  }
}

export namespace DefaultChatClient {
  const DEFAULT_CHAT_CLIENT_OBSERVATION_CONVENTION: ChatClientObservationConvention =
    new DefaultChatClientObservationConvention();

  const DEFAULT_TEMPLATE_RENDERER: TemplateRenderer = new StTemplateRenderer();

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
      type: ChatClient.Type<T>,
      options: { isArray: true },
    ): Promise<ResponseEntity<ChatResponse, T[]>>;
    responseEntity<T>(
      type: ChatClient.Type<T>,
      options?: ChatClient.EntityOptions,
    ): Promise<ResponseEntity<ChatResponse, T>>;
    responseEntity<T>(
      structuredOutputConverter: StructuredOutputConverter<T>,
    ): Promise<ResponseEntity<ChatResponse, T>>;
    async responseEntity<T>(
      typeOrConverter: ChatClient.Type<T> | StructuredOutputConverter<T>,
      _options?: ChatClient.EntityOptions,
    ): Promise<
      ResponseEntity<ChatResponse, T> | ResponseEntity<ChatResponse, T[]>
    > {
      if (typeof typeOrConverter === "function") {
        const converter = new BeanOutputConverter(
          typeOrConverter as unknown as ChatClient.Type<never>,
        );
        return await this.doResponseEntity(converter);
      }
      return await this.doResponseEntity(typeOrConverter);
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
      const entity = outputConverter.convert(responseContent);
      return new ResponseEntity<ChatResponse, T>(chatResponse, entity);
    }

    entity<T>(
      type: ChatClient.Type<T>,
      options: { isArray: true },
    ): Promise<T[] | null>;
    entity<T>(
      structuredOutputConverter: StructuredOutputConverter<T>,
    ): Promise<T | null>;
    entity<T>(
      type: ChatClient.Type<T>,
      options?: ChatClient.EntityOptions,
    ): Promise<T | null>;
    async entity<T>(
      typeOrConverter: ChatClient.Type<T> | StructuredOutputConverter<T>,
    ): Promise<T | T[] | null> {
      if (typeof typeOrConverter === "function") {
        const converter = new BeanOutputConverter(
          typeOrConverter as unknown as ChatClient.Type<never>,
        );
        return this.doEntity(converter);
      }
      return this.doEntity(typeOrConverter);
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
        context.has(ChatClientAttributes.STRUCTURED_OUTPUT_NATIVE.key) &&
        outputConverter instanceof BeanOutputConverter
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
        observationContext.response = response;
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
          observationContext.response = aggregated;
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
    private readonly _userParams = new Map<string, unknown>();
    private readonly _userMetadata = new Map<string, unknown>();
    private readonly _systemParams = new Map<string, unknown>();
    private readonly _systemMetadata = new Map<string, unknown>();
    private readonly _advisors: Advisor[] = [];
    private readonly _advisorParams = new Map<string, unknown>();
    private readonly _toolContext = new Map<string, unknown>();
    private _templateRenderer: TemplateRenderer;
    private _userText: string | null;
    private _systemText: string | null;
    private _chatOptions: ChatOptions | null;

    constructor(ccr: DefaultChatClientRequestSpec);
    constructor(
      chatModel: ChatModel,
      userText: string | null,
      userParams: Map<string, unknown>,
      userMetadata: Map<string, unknown>,
      systemText: string | null,
      systemParams: Map<string, unknown>,
      systemMetadata: Map<string, unknown>,
      toolCallbacks: ToolCallback[],
      toolCallbackProviders: ChatClient.ToolCallbackProvider[],
      messages: Message[],
      toolNames: string[],
      media: Media[],
      chatOptions: ChatOptions | null,
      advisors: Advisor[],
      advisorParams: Map<string, unknown>,
      observationRegistry: ObservationRegistry,
      chatClientObservationConvention: ChatClientObservationConvention | null,
      toolContext: Map<string, unknown>,
      templateRenderer: TemplateRenderer | null,
      advisorObservationConvention: AdvisorObservationConvention | null,
    );
    constructor(
      chatModelOrSpec: ChatModel | DefaultChatClientRequestSpec,
      userText?: string | null,
      userParams?: Map<string, unknown>,
      userMetadata?: Map<string, unknown>,
      systemText?: string | null,
      systemParams?: Map<string, unknown>,
      systemMetadata?: Map<string, unknown>,
      toolCallbacks?: ToolCallback[],
      toolCallbackProviders?: ChatClient.ToolCallbackProvider[],
      messages?: Message[],
      toolNames?: string[],
      media?: Media[],
      chatOptions?: ChatOptions | null,
      advisors?: Advisor[],
      advisorParams?: Map<string, unknown>,
      observationRegistry?: ObservationRegistry,
      chatClientObservationConvention?: ChatClientObservationConvention | null,
      toolContext?: Map<string, unknown>,
      templateRenderer?: TemplateRenderer | null,
      advisorObservationConvention?: AdvisorObservationConvention | null,
    ) {
      if (chatModelOrSpec instanceof DefaultChatClientRequestSpec) {
        const ccr = chatModelOrSpec;
        this._chatModel = ccr._chatModel;
        this._chatOptions = ccr._chatOptions?.copy() ?? null;
        this._userText = ccr._userText;
        this._userParams = new Map(ccr._userParams);
        this._userMetadata = new Map(ccr._userMetadata);
        this._systemText = ccr._systemText;
        this._systemParams = new Map(ccr._systemParams);
        this._systemMetadata = new Map(ccr._systemMetadata);
        this._toolNames.push(...ccr._toolNames);
        this._toolCallbacks.push(...ccr._toolCallbacks);
        this._toolCallbackProviders.push(...ccr._toolCallbackProviders);
        this._messages.push(...ccr._messages);
        this._media.push(...ccr._media);
        this._advisors.push(...ccr._advisors);
        this._advisorParams = new Map(ccr._advisorParams);
        this._observationRegistry = ccr._observationRegistry;
        this._chatClientObservationConvention =
          ccr._chatClientObservationConvention;
        this._toolContext = new Map(ccr._toolContext);
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
      this._chatOptions =
        chatOptions?.copy() ?? this._chatModel.defaultOptions?.copy() ?? null;
      this._userText = userText ?? null;
      this._userParams = new Map(userParams);
      this._userMetadata = new Map(userMetadata);
      this._systemText = systemText ?? null;
      this._systemParams = new Map(systemParams);
      this._systemMetadata = new Map(systemMetadata);
      this._toolNames.push(...toolNames);
      this._toolCallbacks.push(...toolCallbacks);
      this._toolCallbackProviders.push(...toolCallbackProviders);
      this._messages.push(...messages);
      this._media.push(...media);
      this._advisors.push(...advisors);
      this._advisorParams = new Map(advisorParams);
      this._observationRegistry = observationRegistry;
      this._chatClientObservationConvention =
        chatClientObservationConvention ??
        DEFAULT_CHAT_CLIENT_OBSERVATION_CONVENTION;
      this._toolContext = new Map(toolContext);
      this._templateRenderer = templateRenderer ?? DEFAULT_TEMPLATE_RENDERER;
      this._advisorObservationConvention = advisorObservationConvention ?? null;
    }

    get userText(): string | null {
      return this._userText;
    }

    get userParams(): Map<string, unknown> {
      return this._userParams;
    }

    get userMetadata(): Map<string, unknown> {
      return this._userMetadata;
    }

    get systemText(): string | null {
      return this._systemText;
    }

    get systemParams(): Map<string, unknown> {
      return this._systemParams;
    }

    get systemMetadata(): Map<string, unknown> {
      return this._systemMetadata;
    }

    get chatOptions(): ChatOptions | null {
      return this._chatOptions;
    }

    getAdvisors(): Advisor[] {
      return this._advisors;
    }

    get advisorParams(): Map<string, unknown> {
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

    getToolContext(): Map<string, unknown> {
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
        .defaultToolContext(new Map(this._toolContext))
        .defaultToolNames(...this._toolNames);

      if (this._advisors.length > 0) {
        builder.defaultAdvisors((a) =>
          a.advisors(this._advisors).params(this._advisorParams),
        );
      }

      if (StringUtils.hasText(this._userText)) {
        const text = this._userText;
        builder.defaultUser((u) =>
          u
            .text(text)
            .params(new Map(this._userParams))
            .media(...this._media)
            .metadata(new Map(this._userMetadata)),
        );
      }

      if (StringUtils.hasText(this._systemText)) {
        const text = this._systemText;
        builder.defaultSystem((s) =>
          s
            .text(text)
            .params(new Map(this._systemParams))
            .metadata(new Map(this._systemMetadata)),
        );
      }

      if (this._chatOptions != null) {
        builder.defaultOptions(this._chatOptions);
      }

      (
        builder as unknown as { addMessages: (messages: Message[]) => void }
      ).addMessages(this._messages);
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
        for (const [key, value] of advisorSpec.paramsValue.entries()) {
          this._advisorParams.set(key, value);
        }
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

    options<T extends ChatOptions>(
      options: T,
    ): ChatClient.ChatClientRequestSpec {
      assert(options, "options cannot be null");
      this._chatOptions = options;
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

    tools(...toolObjects: unknown[]): ChatClient.ChatClientRequestSpec {
      assert(toolObjects, "toolObjects cannot be null");
      assert(
        toolObjects.every((toolObject) => toolObject != null),
        "toolObjects cannot contain null elements",
      );
      throw new Error(
        "tools(Object...) migration requires ToolCallbacks.from support",
      );
    }

    toolContext(
      toolContext: Map<string, unknown>,
    ): ChatClient.ChatClientRequestSpec {
      assert(toolContext, "toolContext cannot be null");
      for (const [key, value] of toolContext.entries()) {
        assert(key != null, "toolContext keys cannot contain null elements");
        assert(
          value != null,
          "toolContext values cannot contain null elements",
        );
        this._toolContext.set(key, value);
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
        for (const [key, value] of systemSpec.paramsValue.entries()) {
          this._systemParams.set(key, value);
        }
        for (const [key, value] of systemSpec.metadataValue.entries()) {
          this._systemMetadata.set(key, value);
        }
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
        for (const [key, value] of userSpec.paramsValue.entries()) {
          this._userParams.set(key, value);
        }
        this._media.push(...userSpec.mediaValue);
        for (const [key, value] of userSpec.metadataValue.entries()) {
          this._userMetadata.set(key, value);
        }
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
}

function readBufferText(
  text: Buffer,
  charset: BufferEncoding | undefined,
): string {
  assert(charset !== null, "charset cannot be null");
  return text.toString(charset ?? "utf-8");
}
