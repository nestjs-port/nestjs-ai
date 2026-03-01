import assert from "node:assert/strict";
import {
  type Candidate,
  type Content,
  FinishReason,
  type FunctionDeclaration,
  HarmBlockThreshold as GenAiHarmBlockThreshold,
  HarmCategory as GenAiHarmCategory,
  type SafetySetting as GenAiSafetySetting,
  type GenerateContentConfig,
  type GenerateContentResponse,
  type GenerateContentResponseUsageMetadata,
  type GoogleGenAI,
  type Part,
  type Schema,
  type ThinkingConfig,
  ThinkingLevel,
  type Tool,
} from "@google/genai";
import {
  type Logger,
  LoggerFactory,
  type Media,
  NoopObservationRegistry,
  type ObservationRegistry,
  type RetryTemplate,
} from "@nestjs-ai/commons";
import {
  AssistantMessage,
  ChatGenerationMetadata,
  ChatModel,
  ChatModelObservationContext,
  type ChatModelObservationConvention,
  ChatModelObservationDocumentation,
  type ChatOptions,
  ChatResponse,
  ChatResponseMetadata,
  DefaultChatModelObservationConvention,
  DefaultToolExecutionEligibilityPredicate,
  DefaultUsage,
  Generation,
  type Message,
  MessageAggregator,
  MessageType,
  Prompt,
  type ToolCall,
  ToolCallingManager,
  type ToolExecutionEligibilityPredicate,
  ToolExecutionResult,
  type ToolResponseMessage,
  type Usage,
  UsageCalculator,
  type UserMessage,
} from "@nestjs-ai/model";
import { RetryUtils } from "@nestjs-ai/retry";
import { defer, from, Observable, switchMap } from "rxjs";
import { GoogleGenAiCachedContentService } from "./cache";
import {
  GoogleGenAiConstants,
  type GoogleGenAiSafetySetting,
  GoogleGenAiThinkingLevel,
  HarmBlockThreshold,
  HarmCategory,
} from "./common";
import { GoogleGenAiChatOptions } from "./google-gen-ai-chat-options";
import { GoogleGenAiUsage } from "./metadata";
import { GoogleGenAiToolCallingManager } from "./schema";

enum GeminiMessageType {
  USER = "user",
  MODEL = "model",
}

interface GeminiRequest {
  contents: Content[];
  modelName: string;
  config: GenerateContentConfig;
}

export interface GoogleGenAiChatModelProps {
  genAiClient: GoogleGenAI;
  defaultOptions?: GoogleGenAiChatOptions;
  toolCallingManager?: ToolCallingManager;
  toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate;
  retryTemplate?: RetryTemplate;
  observationRegistry?: ObservationRegistry;
  observationConvention?: ChatModelObservationConvention;
}

export class GoogleGenAiChatModel extends ChatModel {
  private static readonly DEFAULT_OBSERVATION_CONVENTION =
    new DefaultChatModelObservationConvention();

  private logger: Logger = LoggerFactory.getLogger(GoogleGenAiChatModel.name);

  private readonly _genAiClient: GoogleGenAI;
  private readonly _defaultOptions: GoogleGenAiChatOptions;
  private readonly _retryTemplate: RetryTemplate;
  private readonly _cachedContentService: GoogleGenAiCachedContentService | null;
  private readonly _toolCallingManager: ToolCallingManager;
  private readonly _toolExecutionEligibilityPredicate: ToolExecutionEligibilityPredicate;
  private readonly _observationRegistry: ObservationRegistry;
  private readonly _observationConvention: ChatModelObservationConvention;

  constructor(props: GoogleGenAiChatModelProps) {
    super();
    assert(props.genAiClient, "GenAI Client must not be null");

    const defaultOpts =
      props.defaultOptions ??
      new GoogleGenAiChatOptions({
        temperature: 0.7,
        topP: 1.0,
        model: GoogleGenAiChatModel.ChatModel.GEMINI_2_0_FLASH,
      });

    assert(defaultOpts, "GoogleGenAiChatOptions must not be null");
    assert(defaultOpts.model, "GoogleGenAiChatOptions.model must not be null");

    this._genAiClient = props.genAiClient;
    this._defaultOptions = defaultOpts;
    this._retryTemplate =
      props.retryTemplate ?? RetryUtils.DEFAULT_RETRY_TEMPLATE;
    this._toolExecutionEligibilityPredicate =
      props.toolExecutionEligibilityPredicate ??
      new DefaultToolExecutionEligibilityPredicate();
    this._observationRegistry =
      props.observationRegistry ?? NoopObservationRegistry.INSTANCE;
    this._observationConvention =
      props.observationConvention ??
      GoogleGenAiChatModel.DEFAULT_OBSERVATION_CONVENTION;

    // Initialize cached content service
    this._cachedContentService = props.genAiClient?.caches
      ? new GoogleGenAiCachedContentService(props.genAiClient)
      : null;

    // Wrap the provided tool calling manager in a GoogleGenAiToolCallingManager
    const tcm = props.toolCallingManager ?? ToolCallingManager.builder();
    if (tcm instanceof GoogleGenAiToolCallingManager) {
      this._toolCallingManager = tcm;
    } else {
      this._toolCallingManager = new GoogleGenAiToolCallingManager(tcm);
    }
  }

  protected override async chatPrompt(prompt: Prompt): Promise<ChatResponse> {
    const requestPrompt = this.buildRequestPrompt(prompt);
    return this.internalCall(requestPrompt, null);
  }

  private async internalCall(
    prompt: Prompt,
    previousChatResponse: ChatResponse | null,
  ): Promise<ChatResponse> {
    const observationContext = new ChatModelObservationContext(
      prompt,
      GoogleGenAiConstants.PROVIDER_NAME,
    );
    const observation = new ChatModelObservationDocumentation().observation(
      this._observationConvention,
      GoogleGenAiChatModel.DEFAULT_OBSERVATION_CONVENTION,
      () => observationContext,
      this._observationRegistry,
    );

    const response = await observation.observe(async () => {
      const chatResponse = await RetryUtils.execute(
        this._retryTemplate,
        async () => {
          const geminiRequest = this.createGeminiRequest(prompt);
          const generateContentResponse =
            await this.getContentResponse(geminiRequest);

          const generations = (
            generateContentResponse.candidates ?? []
          ).flatMap((candidate) =>
            this.responseCandidateToGeneration(candidate),
          );

          const usageMetadata = generateContentResponse.usageMetadata;
          const options = prompt.options as GoogleGenAiChatOptions;
          const currentUsage = this.getDefaultUsage(usageMetadata, options);
          const cumulativeUsage = UsageCalculator.getCumulativeUsage(
            currentUsage,
            previousChatResponse,
          );

          return new ChatResponse({
            generations,
            chatResponseMetadata: this.toChatResponseMetadata(
              cumulativeUsage,
              generateContentResponse.modelVersion ?? "",
            ),
          });
        },
      );

      observationContext.response = chatResponse;
      return chatResponse;
    });

    if (
      this._toolExecutionEligibilityPredicate.isToolExecutionRequired(
        prompt.options as ChatOptions,
        response,
      )
    ) {
      const toolExecutionResult =
        await this._toolCallingManager.executeToolCalls(prompt, response);
      if (toolExecutionResult.returnDirect()) {
        return ChatResponse.builder()
          .from(response)
          .generations(
            ToolExecutionResult.buildGenerations(toolExecutionResult),
          )
          .build();
      }
      return this.internalCall(
        new Prompt(
          toolExecutionResult.conversationHistory(),
          prompt.options as ChatOptions,
        ),
        response,
      );
    }

    return response;
  }

  buildRequestPrompt(prompt: Prompt): Prompt {
    // Process runtime options
    let runtimeOptions: GoogleGenAiChatOptions | null = null;
    if (prompt.options) {
      runtimeOptions = new GoogleGenAiChatOptions(
        prompt.options as Partial<GoogleGenAiChatOptions>,
      );
    }

    // Merge runtime options and default options
    const requestOptions = GoogleGenAiChatModel.mergeOptions(
      runtimeOptions,
      this._defaultOptions,
    );

    // Merge @JsonIgnore-annotated options explicitly
    if (runtimeOptions) {
      requestOptions.internalToolExecutionEnabled =
        runtimeOptions.internalToolExecutionEnabled ??
        this._defaultOptions.internalToolExecutionEnabled;

      requestOptions.toolNames =
        runtimeOptions.toolNames.size > 0
          ? new Set(runtimeOptions.toolNames)
          : new Set(this._defaultOptions.toolNames);

      requestOptions.toolCallbacks =
        runtimeOptions.toolCallbacks.length > 0
          ? [...runtimeOptions.toolCallbacks]
          : [...this._defaultOptions.toolCallbacks];

      requestOptions.toolContext = {
        ...this._defaultOptions.toolContext,
        ...runtimeOptions.toolContext,
      };

      requestOptions.googleSearchRetrieval =
        runtimeOptions.googleSearchRetrieval ??
        this._defaultOptions.googleSearchRetrieval;

      requestOptions.safetySettings =
        runtimeOptions.safetySettings.length > 0
          ? [...runtimeOptions.safetySettings]
          : [...this._defaultOptions.safetySettings];

      requestOptions.labels =
        Object.keys(runtimeOptions.labels).length > 0
          ? { ...runtimeOptions.labels }
          : { ...this._defaultOptions.labels };
    } else {
      requestOptions.internalToolExecutionEnabled =
        this._defaultOptions.internalToolExecutionEnabled;
      requestOptions.toolNames = new Set(this._defaultOptions.toolNames);
      requestOptions.toolCallbacks = [...this._defaultOptions.toolCallbacks];
      requestOptions.toolContext = { ...this._defaultOptions.toolContext };
      requestOptions.googleSearchRetrieval =
        this._defaultOptions.googleSearchRetrieval;
      requestOptions.safetySettings = [...this._defaultOptions.safetySettings];
      requestOptions.labels = { ...this._defaultOptions.labels };
    }

    return new Prompt(prompt.instructions, requestOptions);
  }

  protected override streamPrompt(prompt: Prompt): Observable<ChatResponse> {
    const requestPrompt = this.buildRequestPrompt(prompt);
    return this.internalStream(requestPrompt, null);
  }

  private internalStream(
    prompt: Prompt,
    previousChatResponse: ChatResponse | null,
  ): Observable<ChatResponse> {
    return defer(() => {
      const request = this.createGeminiRequest(prompt);

      const responseStreamPromise =
        this._genAiClient.models.generateContentStream({
          model: request.modelName,
          contents: request.contents,
          config: request.config,
        });

      const chatResponseFlux = new Observable<ChatResponse>((subscriber) => {
        (async () => {
          try {
            const responseStream = await responseStreamPromise;
            for await (const response of responseStream) {
              const generations = (response.candidates ?? []).flatMap(
                (candidate) => this.responseCandidateToGeneration(candidate),
              );

              const usageMetadata = response.usageMetadata;
              const options = prompt.options as GoogleGenAiChatOptions;
              const currentUsage = this.getDefaultUsage(usageMetadata, options);
              const cumulativeUsage = UsageCalculator.getCumulativeUsage(
                currentUsage,
                previousChatResponse,
              );

              const chatResponse = new ChatResponse({
                generations,
                chatResponseMetadata: this.toChatResponseMetadata(
                  cumulativeUsage,
                  response.modelVersion ?? "",
                ),
              });
              subscriber.next(chatResponse);
            }
            subscriber.complete();
          } catch (e) {
            subscriber.error(
              new Error("Failed to generate content", { cause: e }),
            );
          }
        })();
      });

      const flux = chatResponseFlux.pipe(
        switchMap((response) => {
          if (
            this._toolExecutionEligibilityPredicate.isToolExecutionRequired(
              prompt.options as ChatOptions,
              response,
            )
          ) {
            return from(
              this._toolCallingManager.executeToolCalls(prompt, response),
            ).pipe(
              switchMap((toolExecutionResult) => {
                if (toolExecutionResult.returnDirect()) {
                  return from([
                    ChatResponse.builder()
                      .from(response)
                      .generations(
                        ToolExecutionResult.buildGenerations(
                          toolExecutionResult,
                        ),
                      )
                      .build(),
                  ]);
                }
                return this.internalStream(
                  new Prompt(
                    toolExecutionResult.conversationHistory(),
                    prompt.options as ChatOptions,
                  ),
                  response,
                );
              }),
            );
          }
          return from([response]);
        }),
      );

      const observationContext = new ChatModelObservationContext(
        prompt,
        GoogleGenAiConstants.PROVIDER_NAME,
      );
      const observation = new ChatModelObservationDocumentation().observation(
        this._observationConvention,
        GoogleGenAiChatModel.DEFAULT_OBSERVATION_CONVENTION,
        () => observationContext,
        this._observationRegistry,
      );
      return observation.observeStream(() =>
        new MessageAggregator().aggregate(flux, (chatResponse) => {
          observationContext.response = chatResponse;
        }),
      );
    });
  }

  private responseCandidateToGeneration(candidate: Candidate): Generation[] {
    const candidateIndex = candidate.index ?? 0;
    const candidateFinishReason = candidate.finishReason ?? FinishReason.STOP;

    const messageMetadata: Record<string, unknown> = {
      candidateIndex,
      finishReason: candidateFinishReason,
    };

    // Extract thought signatures from response parts if present
    if (candidate.content?.parts) {
      const thoughtSignatures = candidate.content.parts
        .filter((part) => part.thoughtSignature != null)
        .map((part) => part.thoughtSignature as string);

      if (thoughtSignatures.length > 0) {
        messageMetadata.thoughtSignatures = thoughtSignatures;
      }
    }

    const chatGenerationMetadata = ChatGenerationMetadata.builder()
      .finishReason(candidateFinishReason.toString())
      .build();

    const isFunctionCall =
      candidate.content?.parts != null &&
      candidate.content.parts.length > 0 &&
      candidate.content.parts.every((part) => part.functionCall != null);

    if (isFunctionCall) {
      const assistantToolCalls: ToolCall[] = (candidate.content?.parts ?? [])
        .filter((part) => part.functionCall != null)
        .map((part) => {
          const functionCall = part.functionCall as NonNullable<
            typeof part.functionCall
          >;
          const functionName = functionCall.name ?? "";
          const functionArguments = JSON.stringify(functionCall.args ?? {});
          return {
            id: "",
            type: "function",
            name: functionName,
            arguments: functionArguments,
          };
        });

      const assistantMessage = new AssistantMessage({
        content: "",
        properties: messageMetadata,
        toolCalls: assistantToolCalls,
      });

      return [
        new Generation({
          assistantMessage,
          chatGenerationMetadata,
        }),
      ];
    }

    return (candidate.content?.parts ?? []).map((part) => {
      const assistantMessage = new AssistantMessage({
        content: part.text ?? "",
        properties: messageMetadata,
      });
      return new Generation({
        assistantMessage,
        chatGenerationMetadata,
      });
    });
  }

  private toChatResponseMetadata(
    usage: Usage,
    modelVersion: string,
  ): ChatResponseMetadata {
    return ChatResponseMetadata.builder()
      .usage(usage)
      .model(modelVersion)
      .build();
  }

  private getDefaultUsage(
    usageMetadata: GenerateContentResponseUsageMetadata | undefined,
    options: GoogleGenAiChatOptions | null,
  ): Usage {
    // Check if extended metadata should be included (default to true if not configured)
    let includeExtended = true;
    if (options?.includeExtendedUsageMetadata != null) {
      includeExtended = options.includeExtendedUsageMetadata;
    } else if (this._defaultOptions.includeExtendedUsageMetadata != null) {
      includeExtended = this._defaultOptions.includeExtendedUsageMetadata;
    }

    if (includeExtended) {
      return GoogleGenAiUsage.from(usageMetadata);
    }

    return new DefaultUsage({
      promptTokens: usageMetadata?.promptTokenCount ?? 0,
      completionTokens: usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: usageMetadata?.totalTokenCount ?? 0,
    });
  }

  createGeminiRequest(prompt: Prompt): GeminiRequest {
    const requestOptions = prompt.options as GoogleGenAiChatOptions;

    const config: GenerateContentConfig = {};

    const modelName =
      requestOptions.model ?? (this._defaultOptions.model as string);

    // Set generation config parameters
    if (requestOptions.temperature != null) {
      config.temperature = requestOptions.temperature;
    }
    if (requestOptions.maxOutputTokens != null) {
      config.maxOutputTokens = requestOptions.maxOutputTokens;
    }
    if (requestOptions.topK != null) {
      config.topK = requestOptions.topK;
    }
    if (requestOptions.topP != null) {
      config.topP = requestOptions.topP;
    }
    if (requestOptions.candidateCount != null) {
      config.candidateCount = requestOptions.candidateCount;
    }
    if (requestOptions.stopSequences != null) {
      config.stopSequences = requestOptions.stopSequences;
    }
    if (requestOptions.responseMimeType != null) {
      config.responseMimeType = requestOptions.responseMimeType;
    }
    if (requestOptions.responseSchema != null) {
      config.responseJsonSchema = JSON.parse(requestOptions.responseSchema);
    }
    if (requestOptions.frequencyPenalty != null) {
      config.frequencyPenalty = requestOptions.frequencyPenalty;
    }
    if (requestOptions.presencePenalty != null) {
      config.presencePenalty = requestOptions.presencePenalty;
    }

    // Build thinking config if any thinking option is set
    if (
      requestOptions.thinkingBudget != null ||
      requestOptions.includeThoughts != null ||
      requestOptions.thinkingLevel != null
    ) {
      if (requestOptions.thinkingLevel != null) {
        GoogleGenAiChatModel.validateThinkingLevelForModel(
          requestOptions.thinkingLevel,
          modelName,
        );
      }
      const thinkingConfig: ThinkingConfig = {};
      if (requestOptions.thinkingBudget != null) {
        thinkingConfig.thinkingBudget = requestOptions.thinkingBudget;
      }
      if (requestOptions.includeThoughts != null) {
        thinkingConfig.includeThoughts = requestOptions.includeThoughts;
      }
      if (requestOptions.thinkingLevel != null) {
        thinkingConfig.thinkingLevel =
          GoogleGenAiChatModel.mapToGenAiThinkingLevel(
            requestOptions.thinkingLevel,
          );
      }
      config.thinkingConfig = thinkingConfig;
    }

    if (
      requestOptions.labels != null &&
      Object.keys(requestOptions.labels).length > 0
    ) {
      config.labels = requestOptions.labels;
    }

    // Add safety settings
    if (requestOptions.safetySettings.length > 0) {
      config.safetySettings = GoogleGenAiChatModel.toGeminiSafetySettings(
        requestOptions.safetySettings,
      );
    }

    // Add tools
    const tools: Tool[] = [];
    const toolDefinitions =
      this._toolCallingManager.resolveToolDefinitions(requestOptions);
    if (toolDefinitions.length > 0) {
      const functionDeclarations: FunctionDeclaration[] = toolDefinitions.map(
        (toolDefinition) => ({
          name: toolDefinition.name,
          description: toolDefinition.description,
          parameters: JSON.parse(toolDefinition.inputSchema) as Schema,
        }),
      );
      tools.push({ functionDeclarations });
    }

    if (requestOptions.googleSearchRetrieval) {
      tools.push({ googleSearch: {} });
    }

    if (tools.length > 0) {
      config.tools = tools;
    }

    // Handle cached content
    if (
      requestOptions.useCachedContent &&
      requestOptions.cachedContentName != null
    ) {
      config.cachedContent = requestOptions.cachedContentName;
      this.logger.debug(
        `Using cached content: ${requestOptions.cachedContentName}`,
      );
    }

    // Handle system instruction
    const systemMessages = prompt.instructions.filter(
      (m) => m.messageType === MessageType.SYSTEM,
    );
    const systemContents = GoogleGenAiChatModel.toGeminiContent(systemMessages);

    if (systemContents.length > 0) {
      assert(
        systemContents.length <= 1,
        "Only one system message is allowed in the prompt",
      );
      config.systemInstruction = systemContents[0];
    }

    // Create message contents (non-system)
    const nonSystemMessages = prompt.instructions.filter(
      (m) => m.messageType !== MessageType.SYSTEM,
    );
    const contents = GoogleGenAiChatModel.toGeminiContent(nonSystemMessages);

    return { contents, modelName, config };
  }

  override get defaultOptions(): ChatOptions {
    return new GoogleGenAiChatOptions(this._defaultOptions);
  }

  get cachedContentService(): GoogleGenAiCachedContentService | null {
    return this._cachedContentService;
  }

  private async getContentResponse(
    request: GeminiRequest,
  ): Promise<GenerateContentResponse> {
    try {
      return await this._genAiClient.models.generateContent({
        model: request.modelName,
        contents: request.contents,
        config: request.config,
      });
    } catch (e) {
      throw new Error("Failed to generate content", { cause: e });
    }
  }

  // --- Static helpers ---

  private static toGeminiMessageType(type: MessageType): GeminiMessageType {
    assert(type, "Message type must not be null");
    if (
      type === MessageType.SYSTEM ||
      type === MessageType.USER ||
      type === MessageType.TOOL
    ) {
      return GeminiMessageType.USER;
    }
    if (type === MessageType.ASSISTANT) {
      return GeminiMessageType.MODEL;
    }
    throw new Error(`Unsupported message type: ${type}`);
  }

  static messageToGeminiParts(message: Message): Part[] {
    if (message.messageType === MessageType.SYSTEM) {
      const parts: Part[] = [];
      if (message.text != null) {
        parts.push({ text: message.text });
      }
      return parts;
    }

    if (message.messageType === MessageType.USER) {
      const parts: Part[] = [];
      if (message.text != null) {
        parts.push({ text: message.text });
      }

      const userMessage = message as UserMessage;
      parts.push(...GoogleGenAiChatModel.mediaToParts(userMessage.media));

      return parts;
    }

    if (message.messageType === MessageType.ASSISTANT) {
      const assistantMessage = message as AssistantMessage;
      const parts: Part[] = [];

      // Check if there are thought signatures to restore
      let thoughtSignatures: string[] | null = null;
      if (
        assistantMessage.metadata?.thoughtSignatures &&
        Array.isArray(assistantMessage.metadata.thoughtSignatures)
      ) {
        thoughtSignatures = [
          ...(assistantMessage.metadata.thoughtSignatures as string[]),
        ];
      }

      // Add text part
      if (assistantMessage.text) {
        parts.push({ text: assistantMessage.text });
      }

      // Add function call parts with thought signatures attached
      if (assistantMessage.toolCalls.length > 0) {
        for (const toolCall of assistantMessage.toolCalls) {
          const part: Part = {
            functionCall: {
              name: toolCall.name,
              args: GoogleGenAiChatModel.parseJsonToMap(toolCall.arguments),
            },
          };

          // Attach thought signature to function call part if available
          if (thoughtSignatures && thoughtSignatures.length > 0) {
            part.thoughtSignature = thoughtSignatures.shift() as string;
          }

          parts.push(part);
        }
      }

      return parts;
    }

    if (message.messageType === MessageType.TOOL) {
      const toolResponseMessage = message as ToolResponseMessage;
      return toolResponseMessage.responses.map((response) => ({
        functionResponse: {
          id: response.id,
          name: response.name,
          response: GoogleGenAiChatModel.parseJsonToMap(response.responseData),
        },
      }));
    }

    throw new Error(
      `Gemini doesn't support message type: ${message.messageType}`,
    );
  }

  private static mediaToParts(media: Media[]): Part[] {
    return media.map((mediaData) => {
      const data = mediaData.data;
      const mimeType = mediaData.mimeType.toString();

      if (Buffer.isBuffer(data)) {
        return {
          inlineData: {
            data: data.toString("base64"),
            mimeType,
          },
        };
      }

      if (typeof data === "string") {
        return {
          fileData: {
            fileUri: data,
            mimeType,
          },
        };
      }

      throw new Error(`Unsupported media data type: ${typeof data}`);
    });
  }

  private static parseJsonToMap(json: string): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(json);
      if (Array.isArray(parsed)) {
        return { result: parsed };
      }
      if (parsed != null && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
      return { result: parsed };
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${json}`, { cause: e });
    }
  }

  private static toGeminiContent(messages: Message[]): Content[] {
    return messages.map((message) => ({
      role: GoogleGenAiChatModel.toGeminiMessageType(message.messageType),
      parts: GoogleGenAiChatModel.messageToGeminiParts(message),
    }));
  }

  private static toGeminiSafetySettings(
    safetySettings: GoogleGenAiSafetySetting[],
  ): GenAiSafetySetting[] {
    return safetySettings.map((safetySetting) => ({
      category: GoogleGenAiChatModel.mapToGenAiHarmCategory(
        safetySetting.category,
      ),
      threshold: GoogleGenAiChatModel.mapToGenAiHarmBlockThreshold(
        safetySetting.threshold,
      ),
    }));
  }

  private static mapToGenAiHarmCategory(
    category: HarmCategory,
  ): GenAiHarmCategory {
    switch (category) {
      case HarmCategory.HARM_CATEGORY_UNSPECIFIED:
        return GenAiHarmCategory.HARM_CATEGORY_UNSPECIFIED;
      case HarmCategory.HARM_CATEGORY_HATE_SPEECH:
        return GenAiHarmCategory.HARM_CATEGORY_HATE_SPEECH;
      case HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT:
        return GenAiHarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT;
      case HarmCategory.HARM_CATEGORY_HARASSMENT:
        return GenAiHarmCategory.HARM_CATEGORY_HARASSMENT;
      case HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT:
        return GenAiHarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT;
      default:
        throw new Error(`Unknown HarmCategory: ${category}`);
    }
  }

  private static mapToGenAiHarmBlockThreshold(
    threshold: HarmBlockThreshold,
  ): GenAiHarmBlockThreshold {
    switch (threshold) {
      case HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED:
        return GenAiHarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED;
      case HarmBlockThreshold.BLOCK_LOW_AND_ABOVE:
        return GenAiHarmBlockThreshold.BLOCK_LOW_AND_ABOVE;
      case HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE:
        return GenAiHarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;
      case HarmBlockThreshold.BLOCK_ONLY_HIGH:
        return GenAiHarmBlockThreshold.BLOCK_ONLY_HIGH;
      case HarmBlockThreshold.BLOCK_NONE:
        return GenAiHarmBlockThreshold.BLOCK_NONE;
      case HarmBlockThreshold.OFF:
        return GenAiHarmBlockThreshold.OFF;
      default:
        throw new Error(`Unknown HarmBlockThreshold: ${threshold}`);
    }
  }

  private static mapToGenAiThinkingLevel(
    level: GoogleGenAiThinkingLevel,
  ): ThinkingLevel {
    switch (level) {
      case GoogleGenAiThinkingLevel.THINKING_LEVEL_UNSPECIFIED:
        return ThinkingLevel.THINKING_LEVEL_UNSPECIFIED;
      case GoogleGenAiThinkingLevel.MINIMAL:
        return ThinkingLevel.MINIMAL;
      case GoogleGenAiThinkingLevel.LOW:
        return ThinkingLevel.LOW;
      case GoogleGenAiThinkingLevel.MEDIUM:
        return ThinkingLevel.MEDIUM;
      case GoogleGenAiThinkingLevel.HIGH:
        return ThinkingLevel.HIGH;
      default:
        throw new Error(`Unknown ThinkingLevel: ${level}`);
    }
  }

  private static isGemini3ProModel(modelName: string): boolean {
    const lower = modelName.toLowerCase();
    return (
      lower.includes("gemini-3") &&
      lower.includes("pro") &&
      !lower.includes("flash")
    );
  }

  private static validateThinkingLevelForModel(
    level: GoogleGenAiThinkingLevel,
    modelName: string,
  ): void {
    if (level === GoogleGenAiThinkingLevel.THINKING_LEVEL_UNSPECIFIED) {
      return;
    }
    if (GoogleGenAiChatModel.isGemini3ProModel(modelName)) {
      if (
        level === GoogleGenAiThinkingLevel.MINIMAL ||
        level === GoogleGenAiThinkingLevel.MEDIUM
      ) {
        throw new Error(
          `ThinkingLevel.${level} is not supported for Gemini 3 Pro models. ` +
            `Supported levels: LOW, HIGH. Model: ${modelName}`,
        );
      }
    }
  }

  private static mergeOptions(
    runtime: GoogleGenAiChatOptions | null,
    defaults: GoogleGenAiChatOptions,
  ): GoogleGenAiChatOptions {
    if (!runtime) {
      return new GoogleGenAiChatOptions(defaults);
    }

    return new GoogleGenAiChatOptions({
      model: runtime.model ?? defaults.model,
      temperature: runtime.temperature ?? defaults.temperature,
      topP: runtime.topP ?? defaults.topP,
      topK: runtime.topK ?? defaults.topK,
      candidateCount: runtime.candidateCount ?? defaults.candidateCount,
      maxOutputTokens: runtime.maxOutputTokens ?? defaults.maxOutputTokens,
      stopSequences: runtime.stopSequences ?? defaults.stopSequences,
      responseMimeType: runtime.responseMimeType ?? defaults.responseMimeType,
      responseSchema: runtime.responseSchema ?? defaults.responseSchema,
      frequencyPenalty: runtime.frequencyPenalty ?? defaults.frequencyPenalty,
      presencePenalty: runtime.presencePenalty ?? defaults.presencePenalty,
      thinkingBudget: runtime.thinkingBudget ?? defaults.thinkingBudget,
      includeThoughts: runtime.includeThoughts ?? defaults.includeThoughts,
      thinkingLevel: runtime.thinkingLevel ?? defaults.thinkingLevel,
      includeExtendedUsageMetadata:
        runtime.includeExtendedUsageMetadata ??
        defaults.includeExtendedUsageMetadata,
      cachedContentName:
        runtime.cachedContentName ?? defaults.cachedContentName,
      useCachedContent: runtime.useCachedContent ?? defaults.useCachedContent,
      autoCacheThreshold:
        runtime.autoCacheThreshold ?? defaults.autoCacheThreshold,
      autoCacheTtl: runtime.autoCacheTtl ?? defaults.autoCacheTtl,
    });
  }

  // --- ChatModel enum ---

  static readonly ChatModel = {
    GEMINI_1_5_PRO: "gemini-1.5-pro-002",
    GEMINI_1_5_FLASH: "gemini-1.5-flash-002",
    GEMINI_2_0_FLASH: "gemini-2.0-flash-001",
    GEMINI_2_0_FLASH_LIGHT: "gemini-2.0-flash-lite-001",
    GEMINI_2_5_PRO: "gemini-2.5-pro",
    GEMINI_2_5_FLASH: "gemini-2.5-flash",
    GEMINI_2_5_FLASH_LIGHT: "gemini-2.5-flash-lite",
    GEMINI_3_PRO_PREVIEW: "gemini-3-pro-preview",
    GEMINI_3_FLASH_PREVIEW: "gemini-3-flash-preview",
  } as const;
}
