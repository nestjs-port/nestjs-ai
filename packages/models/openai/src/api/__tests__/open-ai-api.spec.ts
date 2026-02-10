import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { join } from "node:path";
import { firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";
import { describe, expect, it } from "vitest";
import { OpenAiApi } from "../open-ai-api";
import {
	AudioResponseFormat,
	type ChatCompletionMessage,
	type ChatCompletionRequest,
	ChatModel,
	type EmbeddingRequest,
	InputAudioFormat,
	type MediaContent,
	OutputModality,
	Role,
	ServiceTier,
	Voice,
} from "../open-ai-api.types";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiApi", () => {
	const apiKey = OPENAI_API_KEY ?? "";
	const openAiApi = OpenAiApi.builder().apiKey(apiKey).build();

	it("chat completion entity", async () => {
		const chatCompletionMessage: ChatCompletionMessage = {
			content: "Hello world",
			role: Role.USER,
		};
		const request: ChatCompletionRequest = {
			messages: [chatCompletionMessage],
			model: "gpt-3.5-turbo",
			temperature: 0.8,
			stream: false,
		};
		const { body } = await openAiApi.chatCompletionEntity(request);

		expect(body).not.toBeNull();
	});

	it("chat completion stream", async () => {
		const chatCompletionMessage: ChatCompletionMessage = {
			content: "Hello world",
			role: Role.USER,
		};
		const request: ChatCompletionRequest = {
			messages: [chatCompletionMessage],
			model: "gpt-3.5-turbo",
			temperature: 0.8,
			stream: true,
		};
		const response = openAiApi.chatCompletionStream(request);
		const chunks = await firstValueFrom(response.pipe(toArray()));

		expect(response).not.toBeNull();
		expect(chunks).not.toBeNull();
	});

	it("validate reasoning tokens", { timeout: 60_000 }, async () => {
		const userMessage: ChatCompletionMessage = {
			content:
				"Are there an infinite number of prime numbers such that n mod 4 == 3? Think through the steps and respond.",
			role: Role.USER,
		};
		const request: ChatCompletionRequest = {
			messages: [userMessage],
			model: ChatModel.GPT_5,
			stream: false,
			reasoning_effort: "high",
		};
		const { body } = await openAiApi.chatCompletionEntity(request);

		expect(body).not.toBeNull();

		const completionTokenDetails = body.usage?.completion_tokens_details;
		expect(completionTokenDetails).not.toBeNull();
		expect(completionTokenDetails?.reasoning_tokens).toBeGreaterThan(0);
	});

	it("embeddings", async () => {
		const embeddingRequest: EmbeddingRequest = {
			input: "Hello world",
			model: "text-embedding-ada-002",
		};
		const { body } = await openAiApi.embeddings(embeddingRequest);

		expect(body).not.toBeNull();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].embedding).toHaveLength(1536);
	});

	it("input audio", async () => {
		const audioFilePath = join(__dirname, "speech1.mp3");
		const audioData = readFileSync(audioFilePath);
		const content: MediaContent[] = [
			{
				type: "text",
				text: "What is this recording about?",
			},
			{
				type: "input_audio",
				input_audio: {
					data: Buffer.from(audioData).toString("base64"),
					format: InputAudioFormat.MP3,
				},
			},
		];
		const chatCompletionMessage: ChatCompletionMessage = {
			content,
			role: Role.USER,
		};
		const chatCompletionRequest: ChatCompletionRequest = {
			messages: [chatCompletionMessage],
			model: ChatModel.GPT_4_O_AUDIO_PREVIEW,
			temperature: 0.0,
			stream: false,
		};
		const { body } = await openAiApi.chatCompletionEntity(
			chatCompletionRequest,
		);

		expect(body).not.toBeNull();

		expect(body.usage?.prompt_tokens_details?.audio_tokens).toBeGreaterThan(0);
		expect(body.usage?.completion_tokens_details?.audio_tokens).toBe(0);

		const messageContent =
			typeof body.choices[0].message.content === "string"
				? body.choices[0].message.content
				: "";
		expect(messageContent.toLowerCase()).toContain("hobbits");
	});

	it("output audio", async () => {
		const chatCompletionMessage: ChatCompletionMessage = {
			content: "Say 'I am a robot'",
			role: Role.USER,
		};
		const audioParameters = {
			voice: Voice.NOVA,
			format: AudioResponseFormat.MP3,
		};
		const chatCompletionRequest: ChatCompletionRequest = {
			messages: [chatCompletionMessage],
			model: ChatModel.GPT_4_O_AUDIO_PREVIEW,
			audio: audioParameters,
			modalities: [OutputModality.AUDIO, OutputModality.TEXT],
			stream: false,
		};
		const { body } = await openAiApi.chatCompletionEntity(
			chatCompletionRequest,
		);

		expect(body).not.toBeNull();

		expect(body.usage?.prompt_tokens_details?.audio_tokens).toBe(0);
		expect(body.usage?.completion_tokens_details?.audio_tokens).toBeGreaterThan(
			0,
		);

		expect(body.choices[0].message.audio?.data).not.toBeNull();
		const transcript = body.choices[0].message.audio?.transcript ?? "";
		expect(transcript.toLowerCase()).toContain("robot");
	});

	it("stream output audio", async () => {
		const chatCompletionMessage: ChatCompletionMessage = {
			content: "What is the magic spell to make objects fly?",
			role: Role.USER,
		};
		const audioParameters = {
			voice: Voice.NOVA,
			format: AudioResponseFormat.MP3,
		};
		const chatCompletionRequest: ChatCompletionRequest = {
			messages: [chatCompletionMessage],
			model: ChatModel.GPT_4_O_AUDIO_PREVIEW,
			audio: audioParameters,
			modalities: [OutputModality.AUDIO, OutputModality.TEXT],
			stream: true,
		};

		const response = openAiApi.chatCompletionStream(chatCompletionRequest);

		await expect(firstValueFrom(response.pipe(toArray()))).rejects.toThrow();
	});

	it.each([
		ChatModel.GPT_5,
		ChatModel.GPT_5_CHAT_LATEST,
		ChatModel.GPT_5_MINI,
		ChatModel.GPT_5_NANO,
	])(
		"chat completion entity with new models: %s",
		{ timeout: 30_000 },
		async (modelName) => {
			const chatCompletionMessage: ChatCompletionMessage = {
				content: "Hello world",
				role: Role.USER,
			};
			const request: ChatCompletionRequest = {
				messages: [chatCompletionMessage],
				model: modelName,
				temperature: 1.0,
				stream: false,
			};
			const { body } = await openAiApi.chatCompletionEntity(request);

			expect(body).not.toBeNull();
			expect(body.choices.length).toBeGreaterThan(0);
			const messageContent =
				typeof body.choices[0].message.content === "string"
					? body.choices[0].message.content
					: "";
			expect(messageContent.length).toBeGreaterThan(0);
			expect(body.model.toLowerCase()).toContain(modelName.toLowerCase());
		},
	);

	it.each([
		ChatModel.GPT_5_NANO,
	])("chat completion entity with new models and low verbosity: %s", async (modelName) => {
		const chatCompletionMessage: ChatCompletionMessage = {
			content:
				"What is the answer to the ultimate question of life, the universe, and everything?",
			role: Role.USER,
		};

		const request: ChatCompletionRequest = {
			messages: [chatCompletionMessage],
			model: modelName,
			stream: false,
			temperature: 1.0,
			verbosity: "low",
		};

		const { body } = await openAiApi.chatCompletionEntity(request);

		expect(body).not.toBeNull();
		expect(body.choices.length).toBeGreaterThan(0);
		const messageContent =
			typeof body.choices[0].message.content === "string"
				? body.choices[0].message.content
				: "";
		expect(messageContent.length).toBeGreaterThan(0);
		expect(body.model.toLowerCase()).toContain(modelName.toLowerCase());
	});

	it.each([
		ChatModel.GPT_5,
		ChatModel.GPT_5_MINI,
		ChatModel.GPT_5_NANO,
	])("chat completion entity with gpt5 models and temperature should fail: %s", async (modelName) => {
		const chatCompletionMessage: ChatCompletionMessage = {
			content: "Hello world",
			role: Role.USER,
		};
		const request: ChatCompletionRequest = {
			messages: [chatCompletionMessage],
			model: modelName,
			temperature: 0.8,
			stream: false,
		};

		await expect(openAiApi.chatCompletionEntity(request)).rejects.toThrow(
			"Unsupported value",
		);
	});

	it.each([
		ChatModel.GPT_5_CHAT_LATEST,
	])("chat completion entity with gpt5 chat and temperature should succeed: %s", async (modelName) => {
		const chatCompletionMessage: ChatCompletionMessage = {
			content: "Hello world",
			role: Role.USER,
		};
		const request: ChatCompletionRequest = {
			messages: [chatCompletionMessage],
			model: modelName,
			temperature: 0.8,
			stream: false,
		};

		const { body } = await openAiApi.chatCompletionEntity(request);

		expect(body).not.toBeNull();
		expect(body.choices.length).toBeGreaterThan(0);
		const messageContent =
			typeof body.choices[0].message.content === "string"
				? body.choices[0].message.content
				: "";
		expect(messageContent.length).toBeGreaterThan(0);
		expect(body.model.toLowerCase()).toContain(modelName.toLowerCase());
	});

	it.each([
		ServiceTier.DEFAULT,
		ServiceTier.PRIORITY,
	])("chat completion entity with service tier: %s", async (serviceTier) => {
		const chatCompletionMessage: ChatCompletionMessage = {
			content:
				"What is the answer to the ultimate question of life, the universe, and everything?",
			role: Role.USER,
		};

		const request: ChatCompletionRequest = {
			messages: [chatCompletionMessage],
			model: ChatModel.GPT_4_O,
			stream: false,
			service_tier: serviceTier,
			temperature: 1.0,
		};

		const { body } = await openAiApi.chatCompletionEntity(request);

		expect(body).not.toBeNull();
		expect(body.service_tier?.toLowerCase()).toContain(
			serviceTier.toLowerCase(),
		);
	});

	it("user agent header is sent in chat completion requests", async () => {
		let recordedRequest: IncomingMessage | null = null;

		const serverPromise = new Promise<Server>((resolve) => {
			const server = createServer((req, res) => {
				recordedRequest = req;
				res.writeHead(200, {
					"Content-Type": "application/json",
				});
				res.end(
					JSON.stringify({
						id: "chatcmpl-123",
						object: "chat.completion",
						created: 1677652288,
						model: "gpt-3.5-turbo",
						choices: [
							{
								index: 0,
								message: {
									role: "assistant",
									content: "Hello there!",
								},
								finish_reason: "stop",
							},
						],
						usage: {
							prompt_tokens: 9,
							completion_tokens: 2,
							total_tokens: 11,
						},
					}),
				);
			});

			server.listen(0, () => {
				resolve(server);
			});
		});

		const server = await serverPromise;
		const address = server.address();
		if (!address || typeof address === "string") {
			throw new Error("Server address is not available");
		}
		const baseUrl = `http://localhost:${address.port}`;

		const testApi = OpenAiApi.builder()
			.apiKey(OPENAI_API_KEY ?? "")
			.baseUrl(baseUrl)
			.completionsPath("/v1/chat/completions")
			.embeddingsPath("/v1/embeddings")
			.build();

		const message: ChatCompletionMessage = {
			content: "Hello world",
			role: Role.USER,
		};
		const request: ChatCompletionRequest = {
			messages: [message],
			model: "gpt-3.5-turbo",
			temperature: 0.8,
			stream: false,
		};
		const { body } = await testApi.chatCompletionEntity(request);

		expect(body).not.toBeNull();

		expect(recordedRequest).not.toBeNull();
		const userAgentHeader = (recordedRequest as unknown as IncomingMessage)
			.headers[OpenAiApi.HTTP_USER_AGENT_HEADER.toLowerCase()];
		expect(userAgentHeader).toBe(OpenAiApi.SPRING_AI_USER_AGENT);

		await new Promise<void>((resolve) => {
			server.close(() => {
				resolve();
			});
		});
	});
});
