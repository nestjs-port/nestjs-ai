import type {
  GenerateContentResponseUsageMetadata,
  ModalityTokenCount,
} from "@google/genai";
import { DefaultUsage } from "@nestjs-ai/model";
import { GoogleGenAiModalityTokenCount } from "./google-gen-ai-modality-token-count";
import {
  type GoogleGenAiTrafficType,
  trafficTypeFrom,
} from "./google-gen-ai-traffic-type";

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
  readonly thoughtsTokenCount?: number;

  readonly cachedContentTokenCount?: number;

  readonly toolUsePromptTokenCount?: number;

  readonly promptTokensDetails?: GoogleGenAiModalityTokenCount[];

  readonly candidatesTokensDetails?: GoogleGenAiModalityTokenCount[];

  readonly cacheTokensDetails?: GoogleGenAiModalityTokenCount[];

  readonly toolUsePromptTokensDetails?: GoogleGenAiModalityTokenCount[];

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

  override toJSON() {
    return {
      ...super.toJSON(),
      thoughtsTokenCount: this.thoughtsTokenCount,
      cachedContentTokenCount: this.cachedContentTokenCount,
      toolUsePromptTokenCount: this.toolUsePromptTokenCount,
      promptTokensDetails: this.promptTokensDetails,
      candidatesTokensDetails: this.candidatesTokensDetails,
      cacheTokensDetails: this.cacheTokensDetails,
      toolUsePromptTokensDetails: this.toolUsePromptTokensDetails,
      trafficType: this.trafficType,
    };
  }

  static from(
    usageMetadata?: GenerateContentResponseUsageMetadata,
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
      ? trafficTypeFrom(usageMetadata.trafficType)
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
}

function convertModalityDetails(
  modalityTokens?: ModalityTokenCount[],
): GoogleGenAiModalityTokenCount[] | undefined {
  if (!modalityTokens) {
    return undefined;
  }

  return modalityTokens
    .map((token) => GoogleGenAiModalityTokenCount.from(token))
    .filter((t): t is GoogleGenAiModalityTokenCount => t != null);
}
