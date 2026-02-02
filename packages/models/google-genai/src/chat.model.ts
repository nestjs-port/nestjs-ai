import assert from "node:assert/strict";
import type { GoogleGenerativeAI } from "@google/generative-ai";
import { type Media, ms, RetryPolicy, RetryTemplate } from "@nestjs-ai/commons";
import type {
	ToolCall,
	ToolCallingManager,
	ToolExecutionResult,
} from "@nestjs-ai/model";
import {
	AssistantMessage,
	ChatGenerationMetadata,
	ChatModel,
	type ChatModelDescription,
	ChatResponse,
	ChatResponseMetadata,
	Generation,
	type Message,
	MessageType,
	Prompt,
	type ToolResponseMessage,
	UsageCalculator,
	type UserMessage,
} from "@nestjs-ai/model";
import { Observable } from "rxjs";
import { GoogleGenAiCachedContentService } from "./cache";
import {
	GoogleGenAiChatOptions,
	type SafetySetting,
	type ToolCallingChatOptions,
} from "./chat.options";
import {
	GoogleGenAiModalityTokenCount,
	type GoogleGenAiTrafficType,
	GoogleGenAiUsage,
	trafficTypeFrom,
} from "./metadata";
import {
	createDefaultToolCallingManager,
	GoogleGenAiToolCallingManager,
	GoogleGenAiToolCallingManager as WrappedToolCallingManager,
} from "./tools";

/**
 * Google GenAI Chat Model implementation.
 * Provides synchronous and streaming chat interactions with Google's Gemini models.
 * Supports all Google GenAI features: thinking, cached content, extended usage, tool calling.
 */
export class GoogleGenAiChatModel extends ChatModel {
	private readonly client: GoogleGenerativeAI;
	private readonly _defaultOptions: GoogleGenAiChatOptions;
	private readonly toolCallingManager: ToolCallingManager;
	private readonly cachedContentService: GoogleGenAiCachedContentService | null;
	private readonly retryTemplate: RetryTemplate;

	constructor(
		client: GoogleGenerativeAI,
		defaultOptions: GoogleGenAiChatOptions,
		toolCallingManager: ToolCallingManager | null = null,
	) {
		super();
		assert.ok(client, "GenAI Client must not be null");
		assert.ok(defaultOptions, "GoogleGenAiChatOptions must not be null");
		assert.ok(
			defaultOptions.model,
			"GoogleGenAiChatOptions.model must not be null",
		);

		this.client = client;
		this._defaultOptions = defaultOptions;

		if (toolCallingManager instanceof WrappedToolCallingManager) {
			this.toolCallingManager = toolCallingManager;
		} else if (toolCallingManager) {
			this.toolCallingManager = new GoogleGenAiToolCallingManager(
				toolCallingManager,
			);
		} else {
			this.toolCallingManager = new GoogleGenAiToolCallingManager(
				createDefaultToolCallingManager(),
			);
		}

		this.cachedContentService = new GoogleGenAiCachedContentService(client);
		this.retryTemplate = new RetryTemplate(
			RetryPolicy.builder()
				.maxRetries(10)
				.delay(ms(2000))
				.multiplier(5)
				.maxDelay(ms(180000))
				.build(),
		);
	}

	/**
	 * Get the default options used for this chat model.
	 * @returns The default GoogleGenAiChatOptions.
	 */
	override get defaultOptions(): GoogleGenAiChatOptions {
		return this._defaultOptions;
	}

	/**
	 * Execute a synchronous chat generation request.
	 * @param request - The prompt containing instructions and options.
	 * @returns A promise resolving to the chat response.
	 * @throws Error if the API returns no candidates.
	 */
	async call(request: Prompt): Promise<ChatResponse> {
		const effectivePrompt = this.buildRequestPrompt(request);
		return this.internalCall(effectivePrompt, null);
	}

	private async internalCall(
		prompt: Prompt,
		previousChatResponse: any | null,
	): Promise<ChatResponse> {
		const geminiRequest = this.createGeminiRequest(prompt);
		const response = await this.internalCallGemini(geminiRequest);

		const candidates = (response as Record<string, unknown>).candidates as
			| unknown[]
			| undefined;

		if (!candidates || candidates.length === 0) {
			throw new Error("No candidates returned from Google GenAI API");
		}

		const generations = candidates.map((candidate) =>
			this.responseCandidateToGeneration(candidate),
		);

		const options =
			(prompt.options as GoogleGenAiChatOptions) || this._defaultOptions;
		const currentUsage = response
			? this.getDefaultUsage(
					(response as Record<string, unknown>).usageMetadata,
					options,
				)
			: null;
		const cumulativeUsage = UsageCalculator.getCumulativeUsage(
			currentUsage,
			previousChatResponse,
		);

		const chatResponse = new ChatResponse({
			generations: generations,
			chatResponseMetadata: this.toChatResponseMetadata(
				cumulativeUsage,
				(response as Record<string, unknown>).modelVersion as
					| string
					| undefined,
			),
		});

		if (options.internalToolExecutionEnabled && chatResponse.hasToolCalls()) {
			const toolResult = await this.executeToolsIfRequired(
				prompt,
				chatResponse,
			);

			if (toolResult) {
				if (toolResult.returnDirect) {
					return new ChatResponse({
						generations: generations,
						chatResponseMetadata: chatResponse.metadata,
					});
				}
				return this.internalCall(
					new Prompt(
						toolResult.conversationHistory as Message[],
						new GoogleGenAiChatOptions(prompt.options ?? {}),
					),
					chatResponse,
				);
			}
		}

		return chatResponse;
	}

	/**
	 * Execute a streaming chat generation request.
	 * @param request - The prompt containing instructions and options.
	 * @returns An observable emitting chat response chunks.
	 */
	override stream(request: Prompt): Observable<ChatResponse> {
		return new Observable<ChatResponse>((subscriber) => {
			const runStream = async () => {
				try {
					const geminiRequest = this.createGeminiRequest(request);
					const generator = this.internalStream(geminiRequest);

					let aggregatedText = "";
					const aggregatedToolCalls: ToolCall[] = [];

					for await (const chunk of generator) {
						const c = chunk as Record<string, unknown>;
						const candidates = c.candidates as unknown[] | undefined;

						if (candidates && candidates.length > 0) {
							const candidate = (candidates as any[])[0] as Record<
								string,
								unknown
							>;
							const content = (candidate.content as any)?.[0] as
								| Record<string, unknown>
								| undefined;
							const parts = content?.parts as unknown[] | undefined;

							if (parts) {
								for (const part of parts) {
									const p = part as Record<string, unknown>;

									if (p.text !== undefined) {
										aggregatedText += p.text as string;
									}

									if (p.functionCall !== undefined) {
										const fc = p.functionCall as Record<string, unknown>;
										aggregatedToolCalls.push({
											id: fc.id as string,
											type: "function",
											name: fc.name as string,
											arguments:
												typeof fc.args === "string"
													? fc.args
													: JSON.stringify(fc.args),
										});
									}
								}
							}

							const assistantMessage = new AssistantMessage({
								content: aggregatedText || "",
								toolCalls:
									aggregatedToolCalls.length > 0
										? aggregatedToolCalls
										: undefined,
							});

							const generation = new Generation({
								assistantMessage: assistantMessage,
								chatGenerationMetadata: ChatGenerationMetadata.builder()
									.finishReason(candidate.finishReason as unknown as string)
									.build(),
							});

							subscriber.next(
								new ChatResponse({
									generations: [generation],
									chatResponseMetadata: this.toChatResponseMetadata(
										c.usageMetadata,
										c.modelVersion as string | undefined,
									),
								}),
							);
						}
					}

					subscriber.complete();
				} catch (error) {
					subscriber.error(error);
				}
			};

			runStream().catch((err) => subscriber.error(err));
		});
	}

	buildRequestPrompt(request: Prompt): Prompt {
		if (!request.options || !this.defaultOptions) {
			return request;
		}

		return new Prompt(
			request.instructions,
			new GoogleGenAiChatOptions({
				...this.defaultOptions,
				...request.options,
			}),
		);
	}

	private createGeminiRequest(prompt: Prompt): unknown {
		const effectivePrompt = this.buildRequestPrompt(prompt);
		const options =
			(effectivePrompt.options as GoogleGenAiChatOptions) ||
			this.defaultOptions ||
			{};

		const instructions = prompt.instructions;
		const systemInstructions = instructions.filter(
			(m) => m.messageType === MessageType.SYSTEM,
		);
		const otherInstructions = instructions.filter(
			(m) => m.messageType !== MessageType.SYSTEM,
		);

		const request: Record<string, unknown> = {
			contents: otherInstructions.map((msg) => this.toGeminiContent(msg)),
		};

		if (options.model) {
			request.model = options.model;
		}

		const generationConfig: Record<string, unknown> = {};

		if (options.temperature !== undefined) {
			generationConfig.temperature = options.temperature;
		}

		if (options.topK !== undefined) {
			generationConfig.topK = options.topK;
		}

		if (options.topP !== undefined) {
			generationConfig.topP = options.topP;
		}

		if (options.maxOutputTokens !== undefined) {
			generationConfig.maxOutputTokens = options.maxOutputTokens;
		}

		if (options.stopSequences && options.stopSequences.length > 0) {
			generationConfig.stopSequences = options.stopSequences;
		}

		if (options.responseMimeType !== undefined) {
			generationConfig.responseMimeType = options.responseMimeType;
		}

		if (options.responseSchema !== undefined) {
			generationConfig.responseSchema = JSON.parse(options.responseSchema);
		}

		if (options.frequencyPenalty !== undefined) {
			generationConfig.frequencyPenalty = options.frequencyPenalty;
		}

		if (options.presencePenalty !== undefined) {
			generationConfig.presencePenalty = options.presencePenalty;
		}

		if (options.candidateCount !== undefined) {
			generationConfig.candidateCount = options.candidateCount;
		}

		if (
			options.thinkingLevel !== undefined ||
			options.thinkingBudget !== undefined ||
			options.includeThoughts !== undefined
		) {
			request.generationConfig = {
				...generationConfig,
			};
		}

		if (options.thinkingLevel !== undefined) {
			(request.generationConfig as Record<string, unknown>).thinkingMode =
				options.thinkingLevel;
		}

		if (options.thinkingBudget !== undefined) {
			(request.generationConfig as Record<string, unknown>).thinkingBudget =
				options.thinkingBudget;
		}

		if (options.includeThoughts !== undefined) {
			(request.generationConfig as Record<string, unknown>).includeThoughts =
				options.includeThoughts;
		}

		if (options.labels && Object.keys(options.labels).length > 0) {
			(request.generationConfig as Record<string, unknown>).labels =
				options.labels;
		}

		if (Object.keys(generationConfig).length > 0) {
			request.generationConfig = generationConfig;
		}

		if (options.cachedContentName) {
			request.cachedContent = options.cachedContentName;
		}

		if (systemInstructions.length > 0) {
			assert.strictEqual(
				systemInstructions.length,
				1,
				"Only one system message is allowed",
			);
			request.systemInstruction = this.toGeminiContent(systemInstructions[0]);
		}

		if (options.googleSearchRetrieval) {
			request.tools = [{ googleSearchRetrieval: true }];
		}

		if (options.safetySettings) {
			request.safetySettings = this.toGeminiSafetySettings(
				options.safetySettings,
			);
		}

		if (options.toolCallbacks && options.toolCallbacks.length > 0) {
			request.tools = this.toolCallingManager
				? this.toolCallingManager.resolveToolDefinitions(
						options as ToolCallingChatOptions,
					)
				: [];
		}

		return request;
	}

	private toGeminiSafetySettings(safetySettings: SafetySetting[]): unknown[] {
		return safetySettings.map((setting) => ({
			category: setting.category,
			threshold: setting.threshold,
		}));
	}

	private toGeminiMessageType(
		type: MessageType,
	): InstanceType<typeof GoogleGenAiChatModel.GeminiMessageType> {
		assert.ok(type, "Message type must not be null");

		switch (type) {
			case MessageType.SYSTEM:
			case MessageType.USER:
			case MessageType.TOOL:
				return GoogleGenAiChatModel.GeminiMessageType.USER;
			case MessageType.ASSISTANT:
				return GoogleGenAiChatModel.GeminiMessageType.MODEL;
			default:
				throw new Error(`Unsupported message type: ${type}`);
		}
	}

	private toGeminiContent(message: Message): unknown {
		const parts: unknown[] = [];

		if (message.text) {
			parts.push({ text: message.text });
		}

		if (
			message.messageType === MessageType.USER &&
			(message as UserMessage).media
		) {
			parts.push(...this.mediaToParts((message as UserMessage).media || []));
		}

		if (
			message.messageType === MessageType.ASSISTANT &&
			(message as AssistantMessage).toolCalls
		) {
			const assistantMessage = message as AssistantMessage;

			for (const toolCall of assistantMessage.toolCalls || []) {
				parts.push({
					functionCall: {
						name: toolCall.name,
						args:
							typeof toolCall.arguments === "string"
								? JSON.parse(toolCall.arguments)
								: toolCall.arguments,
					},
				});
			}
		}

		if (message.messageType === MessageType.TOOL) {
			const toolMsg = message as ToolResponseMessage;
			for (const response of toolMsg.responses) {
				parts.push({
					functionResponse: {
						name: response.name,
						response: JSON.parse(response.responseData),
					},
				});
			}
		}

		return {
			role: this.toGeminiMessageType(message.messageType).value,
			parts,
		};
	}

	private mediaToParts(media: Media[]): unknown[] {
		return media.map((m) => {
			const data = m.data;
			const mimeType = m.mimeType;

			if (typeof data === "string") {
				return { fileData: { mimeType, fileUri: data } };
			}
			if (data instanceof Uint8Array) {
				return {
					inlineData: { mimeType, data: Buffer.from(data).toString("base64") },
				};
			}

			throw new Error("Unsupported media data type");
		});
	}

	private responseCandidateToGeneration(candidate: unknown): Generation {
		const c = candidate as Record<string, unknown>;
		const content = (c.content as any[])?.[0] as
			| Record<string, unknown>
			| undefined;
		const parts = content?.parts as unknown[] | undefined;

		let text = "";
		const toolCalls: ToolCall[] = [];
		const metadata: Record<string, unknown> = {};

		const candidateIndex = (c.index as number | undefined) ?? 0;
		metadata.candidateIndex = candidateIndex;
		metadata.finishReason = c.finishReason;

		if (parts && parts.length > 0) {
			const thoughtSignatures: Uint8Array[] = [];
			for (const part of parts) {
				const p = part as Record<string, unknown>;

				if (p.text !== undefined) {
					text += p.text as string;
				}

				if (p.functionCall !== undefined) {
					const fc = p.functionCall as Record<string, unknown>;
					toolCalls.push({
						id: fc.id as string,
						type: "function",
						name: fc.name as string,
						arguments: (typeof fc.args === "string"
							? fc.args
							: JSON.stringify(fc.args)) as string,
					});
				}

				if (p.functionResponse !== undefined) {
					metadata.functionResponse = p.functionResponse;
				}

				if (p.thought !== undefined) {
					metadata.thought = p.thought;
				}

				if (p.thoughtSignature !== undefined) {
					thoughtSignatures.push(p.thoughtSignature as Uint8Array);
				}
			}

			if (thoughtSignatures.length > 0) {
				metadata.thoughtSignatures = thoughtSignatures;
			}
		}

		const genMetadata = ChatGenerationMetadata.builder()
			.finishReason((c.finishReason as unknown as string) || "UNKNOWN")
			.metadata(metadata)
			.build();

		return new Generation({
			assistantMessage: new AssistantMessage({
				content: text,
				toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
				properties: Object.keys(metadata).length > 0 ? metadata : undefined,
			}),
			chatGenerationMetadata: genMetadata,
		});
	}

	private toChatResponseMetadata(
		usage: any | null | undefined,
		modelVersion: string | undefined,
	): ChatResponseMetadata {
		const metadataBuilder = ChatResponseMetadata.builder();

		if (usage) {
			metadataBuilder.usage(usage);
		}

		if (modelVersion) {
			metadataBuilder.model(modelVersion);
		}

		return metadataBuilder.build();
	}

	private getDefaultUsage(
		responseMetadata: unknown,
		options: GoogleGenAiChatOptions,
	): GoogleGenAiUsage {
		const um = responseMetadata as Record<string, unknown>;
		const includeExtended =
			options?.includeExtendedUsageMetadata ??
			this._defaultOptions.includeExtendedUsageMetadata ??
			false;

		const promptTokens = (um.promptTokenCount as number) || 0;
		const completionTokens = (um.candidatesTokenCount as number) || 0;
		const totalTokens = promptTokens + completionTokens;

		if (!includeExtended) {
			return new GoogleGenAiUsage({
				promptTokens,
				completionTokens,
				totalTokens,
			});
		}

		return new GoogleGenAiUsage({
			promptTokens,
			completionTokens,
			totalTokens,
			thoughtsTokenCount: um.thoughtsTokenCount as number,
			cachedContentTokenCount: um.cachedContentTokenCount as number,
			toolUsePromptTokenCount: um.toolUsePromptTokenCount as number,
			promptTokensDetails: this.toModalityTokenCounts(um.promptTokensDetails),
			candidatesTokensDetails: this.toModalityTokenCounts(
				um.candidatesTokensDetails,
			),
			cacheTokensDetails: this.toModalityTokenCounts(um.cacheTokensDetails),
			toolUsePromptTokensDetails: this.toModalityTokenCounts(
				um.toolUsePromptTokensDetails,
			),
			trafficType: um.trafficType
				? this.toTrafficType(um.trafficType as string)
				: undefined,
			nativeUsage: um,
		});
	}

	private toModalityTokenCounts(
		details: unknown,
	): GoogleGenAiModalityTokenCount[] {
		if (!details || !Array.isArray(details)) {
			return [];
		}

		return details
			.map((d) => GoogleGenAiModalityTokenCount.from(d))
			.filter((item): item is GoogleGenAiModalityTokenCount => item !== null);
	}

	private toTrafficType(trafficType: string): GoogleGenAiTrafficType {
		return trafficTypeFrom(trafficType);
	}

	private async executeToolsIfRequired(
		prompt: Prompt,
		chatResponse: ChatResponse,
	): Promise<ToolExecutionResult | undefined> {
		const effectivePrompt = this.buildRequestPrompt(prompt);
		const options = effectivePrompt.options as GoogleGenAiChatOptions;

		if (!options.internalToolExecutionEnabled) {
			return undefined;
		}

		const hasToolCalls = chatResponse.hasToolCalls();

		if (!hasToolCalls) {
			return undefined;
		}

		return this.toolCallingManager.executeToolCalls(prompt, chatResponse);
	}

	private async internalCallGemini(request: unknown): Promise<unknown> {
		const model = (request as Record<string, unknown>).model as string;
		const generativeModel = this.client.getGenerativeModel({ model });
		return this.retryTemplate.execute(
			() => generativeModel.generateContent(request as any),
			"GoogleGenAiChatModel.internalCallGemini",
		);
	}

	private async *internalStream(request: unknown): AsyncGenerator<unknown> {
		const model = (request as Record<string, unknown>).model as string;
		const generativeModel = this.client.getGenerativeModel({ model });
		const result = await this.retryTemplate.execute(
			() => generativeModel.generateContentStream(request as any),
			"GoogleGenAiChatModel.internalStream",
		);
		for await (const chunk of result.stream) {
			yield chunk;
		}
	}

	public static GeminiMessageType = class GeminiMessageType {
		public static USER = new GeminiMessageType("user");

		public static MODEL = new GeminiMessageType("model");

		public readonly _value: string;

		constructor(value: string) {
			this._value = value;
		}

		public get value() {
			return this._value;
		}
	};

	public static ChatModel = class ChatModel implements ChatModelDescription {
		/**
		 * **gemini-1.5-pro** is recommended to upgrade to **gemini-2.0-flash**
		 *
		 * Discontinuation date: September 24, 2025
		 *
		 * See: [stable-version](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions#stable-version)
		 */
		public static readonly GEMINI_1_5_PRO = new ChatModel("gemini-1.5-pro-002");

		/**
		 * **gemini-1.5-flash** is recommended to upgrade to
		 * **gemini-2.0-flash-lite**
		 *
		 * Discontinuation date: September 24, 2025
		 *
		 * See: [stable-version](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions#stable-version)
		 */
		public static readonly GEMINI_1_5_FLASH = new ChatModel(
			"gemini-1.5-flash-002",
		);

		/**
		 * **gemini-2.0-flash** delivers next-gen features and improved capabilities,
		 * including superior speed, built-in tool use, multimodal generation, and a 1M
		 * token context window.
		 *
		 * Inputs: Text, Code, Images, Audio, Video - 1,048,576 tokens | Outputs: Text,
		 * Audio(Experimental), Images(Experimental) - 8,192 tokens
		 *
		 * Knowledge cutoff: June 2024
		 *
		 * Model ID: gemini-2.0-flash
		 *
		 * See: [gemini-2.0-flash](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash)
		 */
		public static readonly GEMINI_2_0_FLASH = new ChatModel(
			"gemini-2.0-flash-001",
		);

		/**
		 * **gemini-2.0-flash-lite** is the fastest and most cost efficient Flash
		 * model. It's an upgrade path for 1.5 Flash users who want better quality for the
		 * same price and speed.
		 *
		 * Inputs: Text, Code, Images, Audio, Video - 1,048,576 tokens | Outputs: Text -
		 * 8,192 tokens
		 *
		 * Knowledge cutoff: June 2024
		 *
		 * Model ID: gemini-2.0-flash-lite
		 *
		 * See: [gemini-2.0-flash-lite](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash-lite)
		 */
		public static readonly GEMINI_2_0_FLASH_LIGHT = new ChatModel(
			"gemini-2.0-flash-lite-001",
		);

		/**
		 * **gemini-2.5-pro** is the most advanced reasoning Gemini model, capable of
		 * solving complex problems.
		 *
		 * Inputs: Text, Code, Images, Audio, Video - 1,048,576 tokens | Outputs: Text -
		 * 65,536 tokens
		 *
		 * Knowledge cutoff: January 2025
		 *
		 * Model ID: gemini-2.5-pro-preview-05-06
		 *
		 * See: [gemini-2.5-pro](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-pro)
		 */
		public static readonly GEMINI_2_5_PRO = new ChatModel("gemini-2.5-pro");

		/**
		 * **gemini-2.5-flash** is a thinking model that offers great, well-rounded
		 * capabilities. It is designed to offer a balance between price and performance.
		 *
		 * Inputs: Text, Code, Images, Audio, Video - 1,048,576 tokens | Outputs: Text -
		 * 65,536 tokens
		 *
		 * Knowledge cutoff: January 2025
		 *
		 * Model ID: gemini-2.5-flash-preview-04-17
		 *
		 * See: [gemini-2.5-flash](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash)
		 */
		public static readonly GEMINI_2_5_FLASH = new ChatModel("gemini-2.5-flash");

		/**
		 * **gemini-2.5-flash-lite** is the fastest and most cost efficient Flash
		 * model. It's an upgrade path for 2.0 Flash users who want better quality for the
		 * same price and speed.
		 *
		 * Inputs: Text, Code, Images, Audio, Video - 1,048,576 tokens | Outputs: Text -
		 * 8,192 tokens
		 *
		 * Knowledge cutoff: Jan 2025
		 *
		 * Model ID: gemini-2.0-flash-lite
		 *
		 * See: [gemini-2.5-flash-lite](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-lite)
		 */
		public static readonly GEMINI_2_5_FLASH_LIGHT = new ChatModel(
			"gemini-2.5-flash-lite",
		);

		public static readonly GEMINI_3_PRO_PREVIEW = new ChatModel(
			"gemini-3-pro-preview",
		);

		public static readonly GEMINI_3_FLASH_PREVIEW = new ChatModel(
			"gemini-3-flash-preview",
		);

		public readonly value: string;

		constructor(value: string) {
			this.value = value;
		}

		public getValue(): string {
			return this.value;
		}

		get name(): string {
			return this.value;
		}

		get description(): string {
			return this.value;
		}

		get version(): string {
			return "";
		}
	};
}
