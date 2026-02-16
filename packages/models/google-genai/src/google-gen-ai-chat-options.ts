import type {
  StructuredOutputChatOptions,
  ToolCallback,
  ToolCallingChatOptions,
} from "@nestjs-ai/model";
import type {
  GoogleGenAiSafetySetting,
  GoogleGenAiThinkingLevel,
} from "./common";

export class GoogleGenAiChatOptions
  implements ToolCallingChatOptions, StructuredOutputChatOptions
{
  readonly DEFAULT_TOOL_EXECUTION_ENABLED = true as const;

  stopSequences?: string[];

  temperature?: number;

  topP?: number;

  topK?: number;

  candidateCount?: number;

  maxOutputTokens?: number;

  model?: string;

  responseMimeType?: string;

  responseSchema?: string;

  frequencyPenalty?: number;

  presencePenalty?: number;

  thinkingBudget?: number;

  includeThoughts?: boolean;

  thinkingLevel?: GoogleGenAiThinkingLevel;

  includeExtendedUsageMetadata?: boolean;

  cachedContentName?: string;

  useCachedContent?: boolean;

  autoCacheThreshold?: number;

  autoCacheTtl?: string;

  toolCallbacks: ToolCallback[] = [];

  toolNames: Set<string> = new Set();

  internalToolExecutionEnabled: boolean | null = null;

  toolContext: Record<string, unknown> = {};

  googleSearchRetrieval = false;

  safetySettings: GoogleGenAiSafetySetting[] = [];

  labels: Record<string, string> = {};

  constructor(options?: Partial<GoogleGenAiChatOptions>) {
    if (options) {
      if (options.stopSequences !== undefined)
        this.stopSequences = options.stopSequences;
      if (options.temperature !== undefined)
        this.temperature = options.temperature;
      if (options.topP !== undefined) this.topP = options.topP;
      if (options.topK !== undefined) this.topK = options.topK;
      if (options.candidateCount !== undefined)
        this.candidateCount = options.candidateCount;
      if (options.maxOutputTokens !== undefined)
        this.maxOutputTokens = options.maxOutputTokens;
      if (options.model !== undefined) this.model = options.model;
      if (options.responseMimeType !== undefined)
        this.responseMimeType = options.responseMimeType;
      if (options.responseSchema !== undefined)
        this.responseSchema = options.responseSchema;
      if (options.frequencyPenalty !== undefined)
        this.frequencyPenalty = options.frequencyPenalty;
      if (options.presencePenalty !== undefined)
        this.presencePenalty = options.presencePenalty;
      if (options.thinkingBudget !== undefined)
        this.thinkingBudget = options.thinkingBudget;
      if (options.includeThoughts !== undefined)
        this.includeThoughts = options.includeThoughts;
      if (options.thinkingLevel !== undefined)
        this.thinkingLevel = options.thinkingLevel;
      if (options.includeExtendedUsageMetadata !== undefined)
        this.includeExtendedUsageMetadata =
          options.includeExtendedUsageMetadata;
      if (options.cachedContentName !== undefined)
        this.cachedContentName = options.cachedContentName;
      if (options.useCachedContent !== undefined)
        this.useCachedContent = options.useCachedContent;
      if (options.autoCacheThreshold !== undefined)
        this.autoCacheThreshold = options.autoCacheThreshold;
      if (options.autoCacheTtl !== undefined)
        this.autoCacheTtl = options.autoCacheTtl;
      if (options.toolCallbacks !== undefined)
        this.toolCallbacks = [...options.toolCallbacks];
      if (options.toolNames !== undefined)
        this.toolNames = new Set(options.toolNames);
      if (options.internalToolExecutionEnabled !== undefined)
        this.internalToolExecutionEnabled =
          options.internalToolExecutionEnabled;
      if (options.toolContext !== undefined)
        this.toolContext = { ...options.toolContext };
      if (options.googleSearchRetrieval !== undefined)
        this.googleSearchRetrieval = options.googleSearchRetrieval;
      if (options.safetySettings !== undefined)
        this.safetySettings = [...options.safetySettings];
      if (options.labels !== undefined) this.labels = { ...options.labels };
    }
  }

  get maxTokens(): number | undefined {
    return this.maxOutputTokens;
  }

  set maxTokens(maxTokens: number | undefined) {
    this.maxOutputTokens = maxTokens;
  }

  get outputSchema(): string {
    return this.responseSchema ?? "";
  }

  set outputSchema(jsonSchemaText: string) {
    this.responseSchema = jsonSchemaText;
    this.responseMimeType = "application/json";
  }

  copy(): GoogleGenAiChatOptions {
    return new GoogleGenAiChatOptions(this);
  }
}
