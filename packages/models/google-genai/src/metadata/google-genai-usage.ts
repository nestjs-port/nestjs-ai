import { DefaultUsage } from "@nestjs-ai/model";
import { GoogleGenAiModalityTokenCount } from "./google-genai-modality-token-count";
import {
	type GoogleGenAiTrafficType,
	trafficTypeFrom,
} from "./google-genai-traffic-type";

/**
 * Props for creating a GoogleGenAiUsage instance.
 */
export interface GoogleGenAiUsageProps {
	/**
	 * The number of tokens used in the prompt.
	 */
	promptTokens: number;

	/**
	 * The number of tokens used in the completion.
	 */
	completionTokens: number;

	/**
	 * The total number of tokens used.
	 */
	totalTokens: number;

	/**
	 * The number of tokens used for thinking.
	 */
	thoughtsTokenCount?: number;

	/**
	 * The number of tokens used for cached content.
	 */
	cachedContentTokenCount?: number;

	/**
	 * The number of tokens used for tool-use prompt.
	 */
	toolUsePromptTokenCount?: number;

	/**
	 * Detailed token counts per modality for the prompt.
	 */
	promptTokensDetails?: GoogleGenAiModalityTokenCount[];

	/**
	 * Detailed token counts per modality for the candidates.
	 */
	candidatesTokensDetails?: GoogleGenAiModalityTokenCount[];

	/**
	 * Detailed token counts per modality for the cache.
	 */
	cacheTokensDetails?: GoogleGenAiModalityTokenCount[];

	/**
	 * Detailed token counts per modality for the tool-use prompt.
	 */
	toolUsePromptTokensDetails?: GoogleGenAiModalityTokenCount[];

	/**
	 * The traffic type for the request.
	 */
	trafficType?: GoogleGenAiTrafficType;

	/**
	 * The native usage object from the AI provider.
	 */
	nativeUsage?: unknown;
}

/**
 * Extended usage metadata for Google GenAI responses.
 * Includes thinking tokens, cached content, tool-use tokens, and modality breakdowns.
 */
export class GoogleGenAiUsage extends DefaultUsage {
	/**
	 * The number of tokens used for thinking.
	 */
	readonly thoughtsTokenCount?: number;

	/**
	 * The number of tokens used for cached content.
	 */
	readonly cachedContentTokenCount?: number;

	/**
	 * The number of tokens used for tool-use prompt.
	 */
	readonly toolUsePromptTokenCount?: number;

	/**
	 * Detailed token counts per modality for the prompt.
	 */
	readonly promptTokensDetails?: GoogleGenAiModalityTokenCount[];

	/**
	 * Detailed token counts per modality for the candidates.
	 */
	readonly candidatesTokensDetails?: GoogleGenAiModalityTokenCount[];

	/**
	 * Detailed token counts per modality for the cache.
	 */
	readonly cacheTokensDetails?: GoogleGenAiModalityTokenCount[];

	/**
	 * Detailed token counts per modality for the tool-use prompt.
	 */
	readonly toolUsePromptTokensDetails?: GoogleGenAiModalityTokenCount[];

	/**
	 * The traffic type for the request.
	 */
	readonly trafficType?: GoogleGenAiTrafficType;

	constructor(props: GoogleGenAiUsageProps) {
		super({
			promptTokens: props.promptTokens,
			completionTokens: props.completionTokens,
			totalTokens: props.totalTokens,
			nativeUsage: props.nativeUsage,
		});
		this.thoughtsTokenCount = props.thoughtsTokenCount;
		this.cachedContentTokenCount = props.cachedContentTokenCount;
		this.toolUsePromptTokenCount = props.toolUsePromptTokenCount;
		this.promptTokensDetails = props.promptTokensDetails;
		this.candidatesTokensDetails = props.candidatesTokensDetails;
		this.cacheTokensDetails = props.cacheTokensDetails;
		this.toolUsePromptTokensDetails = props.toolUsePromptTokensDetails;
		this.trafficType = props.trafficType;
	}

	static from(
		usageMetadata: Record<string, unknown> | null | undefined,
	): GoogleGenAiUsage {
		if (!usageMetadata) {
			return new GoogleGenAiUsage({
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
			});
		}

		const promptTokens = (usageMetadata.promptTokenCount as number) ?? 0;
		const completionTokens =
			(usageMetadata.candidatesTokenCount as number) ?? 0;
		const totalTokens = (usageMetadata.totalTokenCount as number) ?? 0;
		const thoughtsTokenCount = usageMetadata.thoughtsTokenCount as
			| number
			| undefined;
		const cachedContentTokenCount = usageMetadata.cachedContentTokenCount as
			| number
			| undefined;
		const toolUsePromptTokenCount = usageMetadata.toolUsePromptTokenCount as
			| number
			| undefined;

		const promptTokensDetails = convertModalityDetails(
			usageMetadata.promptTokensDetails,
		);
		const candidatesTokensDetails = convertModalityDetails(
			usageMetadata.candidatesTokensDetails,
		);
		const cacheTokensDetails = convertModalityDetails(
			usageMetadata.cacheTokensDetails,
		);
		const toolUsePromptTokensDetails = convertModalityDetails(
			usageMetadata.toolUsePromptTokensDetails,
		);

		const trafficType = usageMetadata.trafficType
			? trafficTypeFrom(usageMetadata.trafficType as string)
			: undefined;

		return new GoogleGenAiUsage({
			promptTokens,
			completionTokens,
			totalTokens,
			thoughtsTokenCount,
			cachedContentTokenCount,
			toolUsePromptTokenCount,
			promptTokensDetails,
			candidatesTokensDetails,
			cacheTokensDetails,
			toolUsePromptTokensDetails,
			trafficType,
			nativeUsage: usageMetadata,
		});
	}

	override toString(): string {
		return `GoogleGenAiUsage{promptTokens=${this.promptTokens}, completionTokens=${this.completionTokens}, totalTokens=${this.totalTokens}, thoughtsTokenCount=${this.thoughtsTokenCount}, cachedContentTokenCount=${this.cachedContentTokenCount}, toolUsePromptTokenCount=${this.toolUsePromptTokenCount}, trafficType=${this.trafficType}}`;
	}
}

function convertModalityDetails(
	modalityTokens: unknown,
): GoogleGenAiModalityTokenCount[] | undefined {
	if (!modalityTokens || !Array.isArray(modalityTokens)) {
		return undefined;
	}

	return modalityTokens
		.map((token) => GoogleGenAiModalityTokenCount.from(token))
		.filter((t): t is GoogleGenAiModalityTokenCount => t !== null);
}
