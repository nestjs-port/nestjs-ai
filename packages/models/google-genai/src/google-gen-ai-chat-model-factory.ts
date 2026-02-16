import assert from "node:assert/strict";
import { GoogleGenAI, type GoogleGenAIOptions } from "@google/genai";
import {
	CHAT_MODEL_TOKEN,
	type ChatModelFactory,
	OBSERVATION_REGISTRY_TOKEN,
	type ObservationRegistry,
} from "@nestjs-ai/commons";
import {
	ChatModelObservationConvention,
	ToolExecutionEligibilityPredicate,
} from "@nestjs-ai/model";
import { GoogleGenAiCachedContentService } from "./cache";
import { GoogleGenAiChatModel } from "./google-gen-ai-chat-model";
import { GoogleGenAiChatOptions } from "./google-gen-ai-chat-options";

export interface GoogleGenAiConnectionProperties {
	apiKey?: string;
	projectId?: string;
	location?: string;
	credentialsUri?: string;
	vertexAi?: boolean;
}

export interface GoogleGenAiChatProperties
	extends GoogleGenAiConnectionProperties {
	options?: Partial<GoogleGenAiChatOptions>;
	enableCachedContent?: boolean;
}

/**
 * Creates a ChatModelFactory for Google GenAI that produces a GoogleGenAI client
 * and a GoogleGenAiChatModel.
 */
export function googleGenAiChatModelFactory(
	properties: GoogleGenAiChatProperties,
): ChatModelFactory {
	const providers: ChatModelFactory["providers"] = [
		{
			token: GoogleGenAI,
			useFactory: () => buildClient(properties),
			inject: [],
		},
		{
			token: CHAT_MODEL_TOKEN,
			useFactory: (
				genAiClient: GoogleGenAI,
				observationRegistry?: ObservationRegistry,
				observationConvention?: ChatModelObservationConvention,
				toolExecutionEligibilityPredicate?: ToolExecutionEligibilityPredicate,
			) => {
				const defaultOptions = properties.options
					? new GoogleGenAiChatOptions(properties.options)
					: undefined;

				return new GoogleGenAiChatModel({
					genAiClient,
					defaultOptions,
					observationRegistry,
					observationConvention,
					toolExecutionEligibilityPredicate,
				});
			},
			inject: [
				GoogleGenAI,
				{ token: OBSERVATION_REGISTRY_TOKEN, optional: true },
				{ token: ChatModelObservationConvention, optional: true },
				{ token: ToolExecutionEligibilityPredicate, optional: true },
			],
		},
	];

	if (properties.enableCachedContent !== false) {
		providers.push({
			token: GoogleGenAiCachedContentService,
			useFactory: (genAiClient: GoogleGenAI) =>
				new GoogleGenAiCachedContentService(genAiClient),
			inject: [GoogleGenAI],
		});
	}

	return {
		providers,
	};
}

function buildClient(properties: GoogleGenAiConnectionProperties): GoogleGenAI {
	const options: GoogleGenAIOptions = {};
	const apiKey = normalizedText(properties.apiKey);
	if (apiKey) {
		// Gemini Developer API mode
		options.apiKey = apiKey;
	} else {
		// Vertex AI mode
		const projectId = normalizedText(properties.projectId);
		const location = normalizedText(properties.location);
		assert(
			projectId,
			"Google GenAI projectId must be set when apiKey is not provided",
		);
		assert(
			location,
			"Google GenAI location must be set when apiKey is not provided",
		);
		options.vertexai = true;
		options.project = projectId;
		options.location = location;
		// Note: Similar to Spring AI auto-configuration, credentialsUri is kept as
		// connection metadata but is not wired directly into the SDK client here.
	}

	return new GoogleGenAI(options);
}

function normalizedText(value?: string): string | undefined {
	const trimmed = value?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : undefined;
}
