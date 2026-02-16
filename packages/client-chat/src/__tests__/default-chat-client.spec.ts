import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	Media,
	MediaFormat,
	NoopObservationRegistry,
	type TemplateRenderer,
} from "@nestjs-ai/commons";
import {
	AssistantMessage,
	type ChatModel,
	type ChatOptions,
	ChatResponse,
	DefaultToolCallingChatOptions,
	FunctionToolCallback,
	Generation,
	ListOutputConverter,
	type Message,
	Prompt,
	SystemMessage,
	type ToolCallback,
	UserMessage,
} from "@nestjs-ai/model";
import { TestObservationRegistry } from "@nestjs-ai/testing";
import { defaultIfEmpty, lastValueFrom, type Observable, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";

import type { Advisor, BaseAdvisorChain } from "../advisor";
import { SimpleLoggerAdvisor } from "../advisor";
import type { ChatClient } from "../chat-client";
import { DefaultChatClient } from "../default-chat-client";
import { DefaultChatClientBuilder } from "../default-chat-client-builder";
import type { ChatClientObservationConvention } from "../observation";

class Person {
	name = "";
}

class InputType {
	input = "";
}

function asRequestSpec(
	spec: ChatClient.ChatClientRequestSpec,
): DefaultChatClient.DefaultChatClientRequestSpec {
	return spec as DefaultChatClient.DefaultChatClientRequestSpec;
}

function requestData(spec: DefaultChatClient.DefaultChatClientRequestSpec) {
	return spec as unknown as {
		_chatOptions: ChatOptions | null;
		_messages: Message[];
		_advisors: Advisor[];
		_toolNames: string[];
		_toolCallbacks: ToolCallback[];
		_toolContext: Map<string, unknown>;
		_systemText: string | null;
		_systemParams: Map<string, unknown>;
		_systemMetadata: Map<string, unknown>;
		_userText: string | null;
		_userParams: Map<string, unknown>;
		_userMetadata: Map<string, unknown>;
		_media: Media[];
		_templateRenderer: TemplateRenderer;
		_advisorParams: Map<string, unknown>;
	};
}

function createResponse(content: string | null): ChatResponse {
	return new ChatResponse({
		generations: [
			new Generation({
				assistantMessage: new AssistantMessage({ content }),
			}),
		],
	});
}

function createChatModel(
	callImpl?: (prompt: Prompt) => Promise<ChatResponse | null>,
	streamImpl?: (prompt: Prompt) => Observable<ChatResponse>,
): ChatModel {
	let capturedPrompt: Prompt | null = null;
	const model = {
		call: vi.fn(async (prompt: Prompt) => {
			capturedPrompt = prompt;
			if (callImpl) {
				return callImpl(prompt);
			}
			return createResponse("response");
		}),
		stream: vi.fn((prompt: Prompt) => {
			capturedPrompt = prompt;
			if (streamImpl) {
				return streamImpl(prompt);
			}
			return of(createResponse("response"));
		}),
		get defaultOptions() {
			return new DefaultToolCallingChatOptions();
		},
	} as unknown as ChatModel;

	(model as unknown as { __getPrompt: () => Prompt | null }).__getPrompt = () =>
		capturedPrompt;

	return model;
}

function getCapturedPrompt(chatModel: ChatModel): Prompt | null {
	return (
		chatModel as unknown as { __getPrompt: () => Prompt | null }
	).__getPrompt();
}

const userPromptResource = readFileSync(
	resolve(__dirname, "./user-prompt.txt"),
);
const systemPromptResource = readFileSync(
	resolve(__dirname, "./system-prompt.txt"),
);
const tabbyCatResource = readFileSync(resolve(__dirname, "./tabby-cat.png"));

describe("DefaultChatClient", () => {
	it("when chat client request is null then throw", () => {
		expect(
			() =>
				new DefaultChatClient(
					null as unknown as DefaultChatClient.DefaultChatClientRequestSpec,
				),
		).toThrow("defaultChatClientRequest cannot be null");
	});

	it("when prompt then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		expect(chatClient.prompt()).toBeDefined();
	});

	it("when prompt content is empty then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		expect(() => chatClient.prompt("")).toThrow(
			"content cannot be null or empty",
		);
	});

	it("when prompt content then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const spec = asRequestSpec(chatClient.prompt("my question"));
		const data = requestData(spec);
		expect(data._messages).toHaveLength(1);
		expect(data._messages[0]?.text).toBe("my question");
	});

	it("when prompt with messages then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const prompt = new Prompt([
			new SystemMessage({ content: "instructions" }),
			new UserMessage({ content: "my question" }),
		]);
		const spec = asRequestSpec(chatClient.prompt(prompt));
		const data = requestData(spec);
		expect(data._messages).toHaveLength(2);
		expect(data._messages[0]?.text).toBe("instructions");
		expect(data._messages[1]?.text).toBe("my question");
		expect(data._chatOptions).not.toBeNull();
	});

	it("when prompt with options then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const chatOptions = new DefaultToolCallingChatOptions();
		const prompt = new Prompt([], chatOptions);
		const spec = asRequestSpec(chatClient.prompt(prompt));
		const data = requestData(spec);
		expect(data._messages).toHaveLength(0);
		expect(data._chatOptions).toBe(chatOptions);
	});

	it("test mutate", () => {
		const media = new Media({
			mimeType: MediaFormat.IMAGE_PNG,
			data: tabbyCatResource,
		});
		const toolCallback = {
			get toolDefinition() {
				return { name: "tool", description: "", inputSchema: "{}" };
			},
			call: () => "",
		} as unknown as ToolCallback;
		const advisor = new SimpleLoggerAdvisor();
		const templateRenderer = {
			render: (v: string) => v,
		} as unknown as TemplateRenderer;
		const chatOptions = new DefaultToolCallingChatOptions();
		const copyChatOptions = new DefaultToolCallingChatOptions();
		const chatOptionsSpy = vi
			.spyOn(chatOptions, "copy")
			.mockReturnValue(copyChatOptions as unknown as ChatOptions);
		const toolContext = new Map<string, unknown>([["k", "v"]]);
		const userMessage1 = new UserMessage({ content: "u1" });
		const userMessage2 = new UserMessage({ content: "u2" });

		const builder = new DefaultChatClientBuilder(createChatModel());
		builder.addMessages([userMessage1, userMessage2]);
		const original = builder
			.defaultAdvisors(advisor)
			.defaultOptions(chatOptions)
			.defaultUser((u) =>
				u
					.text("original user {userParams}")
					.param("userParams", "user value2")
					.media(media)
					.metadata("userMetadata", "user data3"),
			)
			.defaultSystem((s) =>
				s
					.text("original system {sysParams}")
					.param("sysParams", "system value1"),
			)
			.defaultTemplateRenderer(templateRenderer)
			.defaultToolNames("toolName1", "toolName2")
			.defaultToolCallbacks(toolCallback)
			.defaultToolContext(toolContext)
			.build();

		const originalSpec = asRequestSpec(original.prompt());
		const mutated = original.mutate().build();
		const mutatedSpec = asRequestSpec(mutated.prompt());
		const data = requestData(mutatedSpec);

		expect(mutatedSpec).not.toBe(originalSpec);
		expect(data._messages).toHaveLength(2);
		expect(data._advisors).toHaveLength(1);
		expect(data._chatOptions).toBe(copyChatOptions);
		expect(data._userText).toBe("original user {userParams}");
		expect(data._userParams.get("userParams")).toBe("user value2");
		expect(data._userMetadata.get("userMetadata")).toBe("user data3");
		expect(data._media).toHaveLength(1);
		expect(data._systemText).toBe("original system {sysParams}");
		expect(data._systemParams.get("sysParams")).toBe("system value1");
		expect(data._templateRenderer).toBe(templateRenderer);
		expect(data._toolNames).toEqual(["toolName1", "toolName2"]);
		expect(data._toolCallbacks).toEqual([toolCallback]);
		expect(data._toolContext.get("k")).toBe("v");

		chatOptionsSpy.mockRestore();
	});

	it("when mutate chat client request", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const spec = asRequestSpec(chatClient.prompt().user("my question"));

		const newChatClientBuilder = spec.mutate();
		newChatClientBuilder.defaultUser("another question");
		const newSpec = asRequestSpec(newChatClientBuilder.build().prompt());

		expect(requestData(spec)._userText).toBe("my question");
		expect(requestData(newSpec)._userText).toBe("another question");
	});

	it("build prompt user spec", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(spec).toBeDefined();
		expect(spec.mediaValue).toBeDefined();
		expect(spec.paramsValue).toBeDefined();
		expect(spec.metadataValue).toBeDefined();
		expect(spec.textValue).toBeNull();
	});

	it("when user media is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() => spec.media(null as unknown as Media)).toThrow(
			"media cannot contain null elements",
		);
	});

	it("when user media contains null elements then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() =>
			spec.media(null as unknown as Media, null as unknown as Media),
		).toThrow("media cannot contain null elements");
	});

	it("when user media then return", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		const mediaUri = "http://example.com/image.png";
		spec.media(new Media({ mimeType: MediaFormat.IMAGE_PNG, data: mediaUri }));
		expect(spec.mediaValue).toHaveLength(1);
		expect(spec.mediaValue[0]?.mimeType).toBe(MediaFormat.IMAGE_PNG);
		expect(spec.mediaValue[0]?.data).toBe(mediaUri);
	});

	it("when user media mime type is null with url then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		const mediaUrl = new URL("http://example.com/image.png");
		expect(() => spec.media(null as unknown as MediaFormat, mediaUrl)).toThrow(
			"media cannot contain null elements",
		);
	});

	it("when user media url is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() =>
			spec.media(MediaFormat.IMAGE_PNG, null as unknown as URL),
		).toThrow("resource cannot be null");
	});

	it("when user media mime type and url then return", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		const mediaUrl = new URL("http://example.com/image.png");
		spec.media(MediaFormat.IMAGE_PNG, mediaUrl);
		expect(spec.mediaValue).toHaveLength(1);
		expect(spec.mediaValue[0]?.mimeType).toBe(MediaFormat.IMAGE_PNG);
		expect(spec.mediaValue[0]?.data).toBe(mediaUrl);
	});

	it("when user media mime type is null with resource then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() =>
			spec.media(null as unknown as MediaFormat, tabbyCatResource),
		).toThrow("media cannot contain null elements");
	});

	it("when user media resource is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() =>
			spec.media(MediaFormat.IMAGE_PNG, null as unknown as Buffer),
		).toThrow("resource cannot be null");
	});

	it("when user media mime type and resource then return", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		spec.media(MediaFormat.IMAGE_PNG, tabbyCatResource);
		expect(spec.mediaValue).toHaveLength(1);
		expect(spec.mediaValue[0]?.mimeType).toBe(MediaFormat.IMAGE_PNG);
		expect(spec.mediaValue[0]?.data).toBe(tabbyCatResource);
	});

	it("when user text string is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() => spec.text(null as unknown as string)).toThrow(
			"text cannot be null",
		);
	});

	it("when user text string is empty then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() => spec.text("")).toThrow("text cannot be null or empty");
	});

	it("when user text string then return", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		spec.text("my question");
		expect(spec.textValue).toBe("my question");
	});

	it("when user text resource is null with charset then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() => spec.text(null as unknown as Buffer, "utf-8")).toThrow(
			"text cannot be null",
		);
	});

	it("when user text resource and charset then return", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		spec.text(userPromptResource, "utf-8");
		expect(spec.textValue).toBe("my question");
	});

	it("when user text resource is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() => spec.text(null as unknown as Buffer)).toThrow(
			"text cannot be null",
		);
	});

	it("when user text resource then return", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		spec.text(userPromptResource);
		expect(spec.textValue).toBe("my question");
	});

	it("when user param key is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() => spec.param(null as unknown as string, "value")).toThrow(
			"key cannot be null or empty",
		);
	});

	it("when user param key is empty then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() => spec.param("", "value")).toThrow(
			"key cannot be null or empty",
		);
	});

	it("when user param value is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() => spec.param("key", null)).toThrow("value cannot be null");
	});

	it("when user param key value then return", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		spec.param("key", "value");
		expect(spec.paramsValue.get("key")).toBe("value");
	});

	it("when user params is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() => spec.params(null as unknown as Map<string, unknown>)).toThrow(
			"params cannot be null",
		);
	});

	it("when user params key is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		const params = new Map<string, unknown>();
		params.set(null as unknown as string, "value");
		expect(() => spec.params(params)).toThrow(
			"param keys cannot contain null elements",
		);
	});

	it("when user params value is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		const params = new Map<string, unknown>([["key", null]]);
		expect(() => spec.params(params)).toThrow(
			"param values cannot contain null elements",
		);
	});

	it("when user params then return", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		spec.params(new Map<string, unknown>([["key", "value"]]));
		expect(spec.paramsValue.get("key")).toBe("value");
	});

	it("when user metadata key is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() => spec.metadata(null as unknown as string, "value")).toThrow(
			"metadata cannot be null",
		);
	});

	it("when user metadata key is empty then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() => spec.metadata("", "value")).toThrow(
			"metadata key cannot be null or empty",
		);
	});

	it("when user metadata value is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() => spec.metadata("key", null)).toThrow(
			"metadata value cannot be null",
		);
	});

	it("when user metadata key value then return", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		spec.metadata("key", "value");
		expect(spec.metadataValue.get("key")).toBe("value");
	});

	it("when user metadata is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		expect(() =>
			spec.metadata(null as unknown as Map<string, unknown>),
		).toThrow("metadata cannot be null");
	});

	it("when user metadata map key is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		const metadata = new Map<string, unknown>();
		metadata.set(null as unknown as string, "value");
		expect(() => spec.metadata(metadata)).toThrow(
			"metadata keys cannot contain null elements",
		);
	});

	it("when user metadata map value is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		const metadata = new Map<string, unknown>([["key", null]]);
		expect(() => spec.metadata(metadata)).toThrow(
			"metadata values cannot contain null elements",
		);
	});

	it("when user metadata then return", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		spec.metadata(new Map<string, unknown>([["key", "value"]]));
		expect(spec.metadataValue.get("key")).toBe("value");
	});

	it("build prompt system spec", () => {
		const spec = new DefaultChatClient.DefaultPromptSystemSpec();
		expect(spec).toBeDefined();
		expect(spec.paramsValue).toBeDefined();
		expect(spec.metadataValue).toBeDefined();
		expect(spec.textValue).toBeNull();
	});

	it("when system text string is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptSystemSpec();
		expect(() => spec.text(null as unknown as string)).toThrow(
			"text cannot be null",
		);
	});

	it("when system text string is empty then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptSystemSpec();
		expect(() => spec.text("")).toThrow("text cannot be null or empty");
	});

	it("when system text string then return", () => {
		const spec = new DefaultChatClient.DefaultPromptSystemSpec();
		spec.text("instructions");
		expect(spec.textValue).toBe("instructions");
	});

	it("when system text resource is null with charset then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptSystemSpec();
		expect(() => spec.text(null as unknown as Buffer, "utf-8")).toThrow(
			"text cannot be null",
		);
	});

	it("when system text resource and charset then return", () => {
		const spec = new DefaultChatClient.DefaultPromptSystemSpec();
		spec.text(systemPromptResource, "utf-8");
		expect(spec.textValue).toBe("instructions");
	});

	it("when system text resource is null then throw", () => {
		const spec = new DefaultChatClient.DefaultPromptSystemSpec();
		expect(() => spec.text(null as unknown as Buffer)).toThrow(
			"text cannot be null",
		);
	});

	it("when system text resource then return", () => {
		const spec = new DefaultChatClient.DefaultPromptSystemSpec();
		spec.text(systemPromptResource);
		expect(spec.textValue).toBe("instructions");
	});

	it("build advisor spec", () => {
		const spec = new DefaultChatClient.DefaultAdvisorSpec();
		expect(spec).toBeDefined();
		expect(spec.advisorsValue).toBeDefined();
		expect(spec.paramsValue).toBeDefined();
	});

	it("when advisor param key value then return", () => {
		const spec = new DefaultChatClient.DefaultAdvisorSpec();
		spec.param("key", "value");
		expect(spec.paramsValue.get("key")).toBe("value");
	});

	it("when advisors then return", () => {
		const spec = new DefaultChatClient.DefaultAdvisorSpec();
		const advisor = new SimpleLoggerAdvisor();
		spec.advisors(advisor);
		expect(spec.advisorsValue).toHaveLength(1);
		expect(spec.advisorsValue[0]).toBe(advisor);
	});

	it("build call response spec", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const spec = asRequestSpec(chatClient.prompt("question")).call();
		expect(spec).toBeDefined();
	});

	it("build call response spec with null request", () => {
		expect(
			() =>
				new DefaultChatClient.DefaultCallResponseSpec(
					null as never,
					{} as BaseAdvisorChain,
					NoopObservationRegistry.INSTANCE,
					{} as ChatClientObservationConvention,
				),
		).toThrow("chatClientRequest cannot be null");
	});

	it("when simple prompt then chat client response", async () => {
		const chatModel = createChatModel();
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const spec = asRequestSpec(chatClient.prompt("my question")).call();

		const chatClientResponse = await spec.chatClientResponse();
		expect(chatClientResponse).toBeDefined();
		expect(chatClientResponse.chatResponse?.result?.output.text).toBe(
			"response",
		);

		const actualPrompt = getCapturedPrompt(chatModel);
		expect(actualPrompt?.instructions).toHaveLength(1);
		expect(actualPrompt?.instructions[0]?.text).toBe("my question");
	});

	it("when simple prompt then set request and response on observation context", async () => {
		const chatModel = createChatModel();
		const observationRegistry = TestObservationRegistry.create();
		const chatClient = new DefaultChatClientBuilder(
			chatModel,
			observationRegistry,
			null,
			null,
		).build();
		const spec = asRequestSpec(chatClient.prompt("my question")).call();
		const chatClientResponse = await spec.chatClientResponse();

		expect(chatClientResponse.chatResponse?.result?.output.text).toBe(
			"response",
		);
		expect(observationRegistry.contexts.length).toBeGreaterThan(0);
	});

	it("when simple prompt then chat response", async () => {
		const chatModel = createChatModel();
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const spec = asRequestSpec(chatClient.prompt("my question")).call();
		const chatResponse = await spec.chatResponse();
		expect(chatResponse?.result?.output.text).toBe("response");
	});

	it("when full prompt then chat response", async () => {
		const chatModel = createChatModel();
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const prompt = new Prompt([
			new SystemMessage({ content: "instructions" }),
			new UserMessage({ content: "my question" }),
		]);
		const spec = asRequestSpec(chatClient.prompt(prompt)).call();
		await spec.chatResponse();

		const actualPrompt = getCapturedPrompt(chatModel);
		expect(actualPrompt?.instructions).toHaveLength(2);
		expect(actualPrompt?.instructions[0]?.text).toBe("instructions");
		expect(actualPrompt?.instructions[1]?.text).toBe("my question");
	});

	it("when prompt and user text then chat response", async () => {
		const chatModel = createChatModel();
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const prompt = new Prompt([
			new SystemMessage({ content: "instructions" }),
			new UserMessage({ content: "my question" }),
		]);
		await asRequestSpec(chatClient.prompt(prompt).user("another question"))
			.call()
			.chatResponse();

		const actualPrompt = getCapturedPrompt(chatModel);
		expect(actualPrompt?.instructions).toHaveLength(3);
		expect(actualPrompt?.instructions[2]?.text).toBe("another question");
	});

	it("when user text and messages then chat response", async () => {
		const chatModel = createChatModel();
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const messages: Message[] = [
			new SystemMessage({ content: "instructions" }),
			new UserMessage({ content: "my question" }),
		];
		await asRequestSpec(
			chatClient.prompt().user("another question").messages(messages),
		)
			.call()
			.chatResponse();

		const actualPrompt = getCapturedPrompt(chatModel);
		expect(actualPrompt?.instructions).toHaveLength(3);
		expect(actualPrompt?.instructions[2]?.text).toBe("another question");
	});

	it("when chat response is null", async () => {
		const chatModel = createChatModel(async () => null);
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const chatResponse = await asRequestSpec(chatClient.prompt("my question"))
			.call()
			.chatResponse();
		expect(chatResponse).toBeNull();
	});

	it("when chat response content is null", async () => {
		const chatModel = createChatModel(async () => createResponse(null));
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const content = await asRequestSpec(chatClient.prompt("my question"))
			.call()
			.content();
		expect(content).toBeNull();
	});

	it("when response entity with converter is null", async () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		await expect(
			asRequestSpec(chatClient.prompt("my question"))
				.call()
				.responseEntity(null as unknown as ListOutputConverter),
		).rejects.toThrow("structuredOutputConverter cannot be null");
	});

	it("when response entity with converter and chat response content null", async () => {
		const chatModel = createChatModel(async () => createResponse(null));
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const responseEntity = await asRequestSpec(chatClient.prompt("my question"))
			.call()
			.responseEntity(new ListOutputConverter());
		expect(responseEntity.response).not.toBeNull();
		expect(responseEntity.entity).toBeNull();
	});

	it("when response entity with converter", async () => {
		const chatModel = createChatModel(async () =>
			createResponse("James Bond, Ethan Hunt, Jason Bourne"),
		);
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const responseEntity = await asRequestSpec(chatClient.prompt("my question"))
			.call()
			.responseEntity(new ListOutputConverter());
		expect(responseEntity.response).not.toBeNull();
		expect(responseEntity.entity).toHaveLength(3);
	});

	it("when response entity with type is null", async () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		await expect(
			asRequestSpec(chatClient.prompt("my question"))
				.call()
				.responseEntity(null as unknown as ChatClient.Type<string>),
		).rejects.toThrow("structuredOutputConverter cannot be null");
	});

	it("when response entity with type", async () => {
		const chatModel = createChatModel(async () =>
			createResponse('{ "name": "James Bond" }'),
		);
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const responseEntity = await asRequestSpec(chatClient.prompt("my question"))
			.call()
			.responseEntity(Person);
		expect(responseEntity.response).not.toBeNull();
		expect(responseEntity.entity).not.toBeNull();
		expect(responseEntity.entity?.name).toBe("James Bond");
	});

	it("when entity with converter is null", async () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		await expect(
			asRequestSpec(chatClient.prompt("my question"))
				.call()
				.entity(null as unknown as ListOutputConverter),
		).rejects.toThrow("structuredOutputConverter cannot be null");
	});

	it("when entity with converter and chat response content null", async () => {
		const chatModel = createChatModel(async () => createResponse(null));
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const entity = await asRequestSpec(chatClient.prompt("my question"))
			.call()
			.entity(new ListOutputConverter());
		expect(entity).toBeNull();
	});

	it("when entity with converter", async () => {
		const chatModel = createChatModel(async () =>
			createResponse("James Bond, Ethan Hunt, Jason Bourne"),
		);
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const entity = await asRequestSpec(chatClient.prompt("my question"))
			.call()
			.entity(new ListOutputConverter());
		expect(entity).toHaveLength(3);
	});

	it("when entity with type is null", async () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		await expect(
			asRequestSpec(chatClient.prompt("my question"))
				.call()
				.entity(null as unknown as ChatClient.Type<string>),
		).rejects.toThrow("structuredOutputConverter cannot be null");
	});

	it("when entity with type and chat response content null", async () => {
		const chatModel = createChatModel(async () => createResponse(null));
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const entity = await asRequestSpec(chatClient.prompt("my question"))
			.call()
			.entity(String);
		expect(entity).toBeNull();
	});

	it("when entity with type", async () => {
		const chatModel = createChatModel(async () =>
			createResponse('{ "name": "James Bond" }'),
		);
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const entity = await asRequestSpec(chatClient.prompt("my question"))
			.call()
			.entity(Person);
		expect(entity).not.toBeNull();
		expect((entity as Person).name).toBe("James Bond");
	});

	it("build stream response spec", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const spec = asRequestSpec(chatClient.prompt("question")).stream();
		expect(spec).toBeDefined();
	});

	it("when simple prompt then flux chat client response", async () => {
		const chatModel = createChatModel(undefined, () =>
			of(createResponse("response")),
		);
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const response = await lastValueFrom(
			asRequestSpec(chatClient.prompt("my question"))
				.stream()
				.chatClientResponse(),
		);

		expect(response.chatResponse?.result?.output.text).toBe("response");
		const prompt = getCapturedPrompt(chatModel);
		expect(prompt?.instructions).toHaveLength(1);
		expect(prompt?.instructions[0]?.text).toBe("my question");
	});

	it("when simple prompt then set flux response on observation context", async () => {
		const chatModel = createChatModel(undefined, () =>
			of(createResponse("response")),
		);
		const observationRegistry = TestObservationRegistry.create();
		const chatClient = new DefaultChatClientBuilder(
			chatModel,
			observationRegistry,
			null,
			null,
		).build();
		await lastValueFrom(
			asRequestSpec(chatClient.prompt("my question"))
				.stream()
				.chatClientResponse(),
		);
		expect(observationRegistry.contexts.length).toBeGreaterThan(0);
	});

	it("when simple prompt then flux chat response", async () => {
		const chatModel = createChatModel(undefined, () =>
			of(createResponse("response")),
		);
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const response = await lastValueFrom(
			asRequestSpec(chatClient.prompt("my question")).stream().chatResponse(),
		);
		expect(response.result?.output.text).toBe("response");
	});

	it("when full prompt then flux chat response", async () => {
		const chatModel = createChatModel(undefined, () =>
			of(createResponse("response")),
		);
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const prompt = new Prompt([
			new SystemMessage({ content: "instructions" }),
			new UserMessage({ content: "my question" }),
		]);
		await lastValueFrom(
			asRequestSpec(chatClient.prompt(prompt)).stream().chatResponse(),
		);
		const actualPrompt = getCapturedPrompt(chatModel);
		expect(actualPrompt?.instructions).toHaveLength(2);
	});

	it("when prompt and user text then flux chat response", async () => {
		const chatModel = createChatModel(undefined, () =>
			of(createResponse("response")),
		);
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const prompt = new Prompt([
			new SystemMessage({ content: "instructions" }),
			new UserMessage({ content: "my question" }),
		]);
		await lastValueFrom(
			asRequestSpec(chatClient.prompt(prompt).user("another question"))
				.stream()
				.chatResponse(),
		);
		const actualPrompt = getCapturedPrompt(chatModel);
		expect(actualPrompt?.instructions).toHaveLength(3);
	});

	it("when user text and messages then flux chat response", async () => {
		const chatModel = createChatModel(undefined, () =>
			of(createResponse("response")),
		);
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const messages: Message[] = [
			new SystemMessage({ content: "instructions" }),
			new UserMessage({ content: "my question" }),
		];
		await lastValueFrom(
			asRequestSpec(
				chatClient.prompt().user("another question").messages(messages),
			)
				.stream()
				.chatResponse(),
		);
		const actualPrompt = getCapturedPrompt(chatModel);
		expect(actualPrompt?.instructions).toHaveLength(3);
	});

	it("when chat response content is null then return flux", async () => {
		const chatModel = createChatModel(undefined, () =>
			of(createResponse(null)),
		);
		const chatClient = new DefaultChatClientBuilder(chatModel).build();
		const content = await lastValueFrom(
			asRequestSpec(chatClient.prompt("my question"))
				.stream()
				.content()
				.pipe(defaultIfEmpty(null)),
		);
		expect(content).toBeNull();
	});

	it("build chat client request spec", () => {
		const chatModel = createChatModel();
		const spec = new DefaultChatClient.DefaultChatClientRequestSpec(
			chatModel,
			null,
			new Map(),
			new Map(),
			null,
			new Map(),
			new Map(),
			[],
			[],
			[],
			[],
			[],
			null,
			[],
			new Map(),
			NoopObservationRegistry.INSTANCE,
			null,
			new Map(),
			null,
			null,
		);
		expect(spec).toBeDefined();
	});

	it("when chat model is null then throw", () => {
		expect(
			() =>
				new DefaultChatClient.DefaultChatClientRequestSpec(
					null as never,
					null,
					new Map(),
					new Map(),
					null,
					new Map(),
					new Map(),
					[],
					[],
					[],
					[],
					[],
					null,
					[],
					new Map(),
					NoopObservationRegistry.INSTANCE,
					null,
					new Map(),
					null,
					null,
				),
		).toThrow("chatModel cannot be null");
	});

	it("when observation registry is null then throw", () => {
		expect(
			() =>
				new DefaultChatClient.DefaultChatClientRequestSpec(
					createChatModel(),
					null,
					new Map(),
					new Map(),
					null,
					new Map(),
					new Map(),
					[],
					[],
					[],
					[],
					[],
					null,
					[],
					new Map(),
					null as never,
					null,
					new Map(),
					null,
					null,
				),
		).toThrow("observationRegistry cannot be null");
	});

	it("when advisor consumer then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const loggerAdvisor = new SimpleLoggerAdvisor();
		const spec = asRequestSpec(
			chatClient
				.prompt()
				.advisors((advisor) =>
					advisor.advisors(loggerAdvisor).param("topic", "AI"),
				),
		);
		const data = requestData(spec);
		expect(data._advisors).toContain(loggerAdvisor);
		expect(data._advisorParams.get("topic")).toBe("AI");
	});

	it("when request advisors with null elements then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		expect(() =>
			chatClient.prompt().advisors(null as unknown as Advisor),
		).toThrow("advisors cannot contain null elements");
	});

	it("when request advisors then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const advisor = new SimpleLoggerAdvisor();
		const spec = asRequestSpec(chatClient.prompt().advisors(advisor));
		expect(requestData(spec)._advisors).toContain(advisor);
	});

	it("when messages with null elements then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		expect(() =>
			chatClient.prompt().messages(null as unknown as Message),
		).toThrow("messages cannot contain null elements");
	});

	it("when messages then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const message = new UserMessage({ content: "question" });
		const spec = asRequestSpec(chatClient.prompt().messages(message));
		expect(requestData(spec)._messages).toContain(message);
	});

	it("when options is null then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		expect(() =>
			chatClient.prompt().options(null as unknown as ChatOptions),
		).toThrow("options cannot be null");
	});

	it("when options then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const options = new DefaultToolCallingChatOptions();
		const spec = asRequestSpec(chatClient.prompt().options(options));
		expect(requestData(spec)._chatOptions).toBe(options);
	});

	it("when tool names element is null then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		expect(() =>
			chatClient.prompt().toolNames("myTool", null as unknown as string),
		).toThrow("toolNames cannot contain null elements");
	});

	it("when tool names then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const spec = asRequestSpec(chatClient.prompt().toolNames("myTool"));
		expect(requestData(spec)._toolNames).toContain("myTool");
	});

	it("when tool callbacks element is null then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const callback = {
			get toolDefinition() {
				return { name: "x", description: "", inputSchema: "{}" };
			},
			call: () => "",
		} as unknown as ToolCallback;
		expect(() =>
			chatClient
				.prompt()
				.toolCallbacks(callback, null as unknown as ToolCallback),
		).toThrow("toolCallbacks cannot contain null elements");
	});

	it("when tool callbacks then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const callback = {
			get toolDefinition() {
				return { name: "x", description: "", inputSchema: "{}" };
			},
			call: () => "",
		} as unknown as ToolCallback;
		const spec = asRequestSpec(chatClient.prompt().toolCallbacks(callback));
		expect(requestData(spec)._toolCallbacks).toContain(callback);
	});

	it("when function name is null then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		expect(() =>
			chatClient.prompt().toolCallbacks(
				FunctionToolCallback.builder(
					null as unknown as string,
					(_input: InputType) => "hello",
				)
					.description("description")
					.inputType(InputType)
					.build(),
			),
		).toThrow("name cannot be null or empty");
	});

	it("when function name is empty then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		expect(() =>
			chatClient.prompt().toolCallbacks(
				FunctionToolCallback.builder("", (_input: InputType) => "hello")
					.description("description")
					.inputType(InputType)
					.build(),
			),
		).toThrow("name cannot be null or empty");
	});

	it("when function then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const spec = asRequestSpec(
			chatClient.prompt().toolCallbacks(
				FunctionToolCallback.builder("name", (_input: InputType) => "hello")
					.inputType(InputType)
					.description("description")
					.build(),
			),
		);
		expect(
			requestData(spec)._toolCallbacks.some(
				(callback) => callback.toolDefinition.name === "name",
			),
		).toBe(true);
	});

	it("when bi function then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const spec = asRequestSpec(
			chatClient.prompt().toolCallbacks(
				FunctionToolCallback.builder(
					"name",
					(_input: InputType, _ctx) => "hello",
				)
					.description("description")
					.inputType(InputType)
					.build(),
			),
		);
		expect(
			requestData(spec)._toolCallbacks.some(
				(callback) => callback.toolDefinition.name === "name",
			),
		).toBe(true);
	});

	it("when tool context is null then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		expect(() =>
			chatClient.prompt().toolContext(null as unknown as Map<string, unknown>),
		).toThrow("toolContext cannot be null");
	});

	it("when tool context key is null then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const toolContext = new Map<string, unknown>();
		toolContext.set(null as unknown as string, "value");
		expect(() => chatClient.prompt().toolContext(toolContext)).toThrow(
			"toolContext keys cannot contain null elements",
		);
	});

	it("when tool context value is null then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const toolContext = new Map<string, unknown>([["key", null]]);
		expect(() => chatClient.prompt().toolContext(toolContext)).toThrow(
			"toolContext values cannot contain null elements",
		);
	});

	it("when tool context then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const spec = asRequestSpec(
			chatClient.prompt().toolContext(new Map([["key", "value"]])),
		);
		expect(requestData(spec)._toolContext.get("key")).toBe("value");
	});

	it("when system text is null then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		expect(() => chatClient.prompt().system(null as unknown as string)).toThrow(
			"text cannot be null",
		);
	});

	it("when system text then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const spec = asRequestSpec(
			chatClient.prompt().system((system) => system.text("instructions")),
		);
		expect(requestData(spec)._systemText).toBe("instructions");
	});

	it("when system consumer then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const spec = asRequestSpec(
			chatClient
				.prompt()
				.system((system) =>
					system
						.text("my instruction about {topic}")
						.param("topic", "AI")
						.metadata("msgId", "uuid-xxx"),
				),
		);
		const data = requestData(spec);
		expect(data._systemText).toBe("my instruction about {topic}");
		expect(data._systemParams.get("topic")).toBe("AI");
		expect(data._systemMetadata.get("msgId")).toBe("uuid-xxx");
	});

	it("when user text is null then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		expect(() => chatClient.prompt().user(null as unknown as string)).toThrow(
			"text cannot be null",
		);
	});

	it("when user text then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const spec = asRequestSpec(
			chatClient.prompt().user((user) => user.text("my question")),
		);
		expect(requestData(spec)._userText).toBe("my question");
	});

	it("when user consumer then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const spec = asRequestSpec(
			chatClient
				.prompt()
				.user((user) =>
					user
						.text("my question about {topic}")
						.param("topic", "AI")
						.metadata("msgId", "uuid-xxx")
						.media(MediaFormat.IMAGE_PNG, tabbyCatResource),
				),
		);
		const data = requestData(spec);
		expect(data._userText).toBe("my question about {topic}");
		expect(data._userParams.get("topic")).toBe("AI");
		expect(data._media).toHaveLength(1);
		expect(data._userMetadata.get("msgId")).toBe("uuid-xxx");
	});

	it("when default chat client builder with observation registry then return", () => {
		const chatModel = createChatModel();
		const observationRegistry = NoopObservationRegistry.INSTANCE;
		const observationConvention = {} as ChatClientObservationConvention;
		const advisorObservationConvention = {} as never;
		const builder = new DefaultChatClientBuilder(
			chatModel,
			observationRegistry,
			observationConvention,
			advisorObservationConvention,
		);
		expect(builder).toBeDefined();
	});

	it("when prompt with system user and options then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const options = new DefaultToolCallingChatOptions();
		const spec = asRequestSpec(
			chatClient
				.prompt()
				.system("instructions")
				.user("question")
				.options(options),
		);
		const data = requestData(spec);
		expect(data._systemText).toBe("instructions");
		expect(data._userText).toBe("question");
		expect(data._chatOptions).toBe(options);
	});

	it("when tool names with empty array then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const spec = asRequestSpec(chatClient.prompt().toolNames());
		expect(requestData(spec)._toolNames).toHaveLength(0);
	});

	it("when user params with empty map then return", () => {
		const spec = new DefaultChatClient.DefaultPromptUserSpec();
		spec.params(new Map());
		expect(spec.paramsValue.size).toBe(0);
	});

	it("when system params with empty map then return", () => {
		const spec = new DefaultChatClient.DefaultPromptSystemSpec();
		spec.params(new Map());
		expect(spec.paramsValue.size).toBe(0);
	});

	it("when advisor spec with multiple params then all stored", () => {
		const spec = new DefaultChatClient.DefaultAdvisorSpec();
		spec
			.param("param1", "value1")
			.param("param2", "value2")
			.param("param3", "value3");
		expect(spec.paramsValue.get("param1")).toBe("value1");
		expect(spec.paramsValue.get("param2")).toBe("value2");
		expect(spec.paramsValue.get("param3")).toBe("value3");
	});

	it("when messages with empty list then return", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		const spec = asRequestSpec(chatClient.prompt().messages([]));
		expect(requestData(spec)._messages).toBeDefined();
	});

	it("when mutate builder then returns same type", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		expect(chatClient.mutate()).toBeInstanceOf(DefaultChatClientBuilder);
	});

	it("when system consumer with null param value then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		expect(() =>
			chatClient.prompt().system((system) => system.param("key", null)),
		).toThrow("value cannot be null");
	});

	it("when user consumer with null param value then throw", () => {
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		expect(() =>
			chatClient.prompt().user((user) => user.param("key", null)),
		).toThrow("value cannot be null");
	});

	it("when tool callback provider then not eagerly evaluated", () => {
		let providerCalls = 0;
		const provider: ChatClient.ToolCallbackProvider = {
			get toolCallbacks() {
				providerCalls += 1;
				return [];
			},
		};
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		chatClient.prompt().user("test").toolCallbacks(provider);
		expect(providerCalls).toBe(0);
	});

	it("when tool callback provider then lazily evaluated on call", async () => {
		let providerCalls = 0;
		const provider: ChatClient.ToolCallbackProvider = {
			get toolCallbacks() {
				providerCalls += 1;
				return [];
			},
		};
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		await chatClient
			.prompt()
			.user("test")
			.toolCallbacks(provider)
			.call()
			.content();
		expect(providerCalls).toBe(1);
	});

	it("when tool callback provider then lazily evaluated on stream", async () => {
		let providerCalls = 0;
		const provider: ChatClient.ToolCallbackProvider = {
			get toolCallbacks() {
				providerCalls += 1;
				return [];
			},
		};
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		await lastValueFrom(
			chatClient
				.prompt()
				.user("test")
				.toolCallbacks(provider)
				.stream()
				.content()
				.pipe(defaultIfEmpty("")),
		);
		expect(providerCalls).toBe(1);
	});

	it("when multiple tool callback providers then all lazily evaluated", async () => {
		let provider1Calls = 0;
		let provider2Calls = 0;
		const provider1: ChatClient.ToolCallbackProvider = {
			get toolCallbacks() {
				provider1Calls += 1;
				return [];
			},
		};
		const provider2: ChatClient.ToolCallbackProvider = {
			get toolCallbacks() {
				provider2Calls += 1;
				return [];
			},
		};
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		await chatClient
			.prompt()
			.user("test")
			.toolCallbacks(provider1, provider2)
			.call()
			.content();

		expect(provider1Calls).toBe(1);
		expect(provider2Calls).toBe(1);
	});

	it("when tool callbacks and providers then both used", async () => {
		let providerCalls = 0;
		const provider: ChatClient.ToolCallbackProvider = {
			get toolCallbacks() {
				providerCalls += 1;
				return [];
			},
		};
		const callback = {
			get toolDefinition() {
				return { name: "direct", description: "", inputSchema: "{}" };
			},
			call: () => "",
		} as unknown as ToolCallback;
		const chatClient = new DefaultChatClientBuilder(createChatModel()).build();
		await chatClient
			.prompt()
			.user("test")
			.toolCallbacks(callback)
			.toolCallbacks(provider)
			.call()
			.content();
		expect(providerCalls).toBe(1);
	});
});
