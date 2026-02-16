/**
 * OpenAI Properties
 * Converted from Spring AI OpenAI autoconfigure properties.
 *
 * Represents the full configuration available under `spring.ai.openai.*`
 */

import type { OpenAiChatOptions } from "./open-ai-chat-options";

// ============================================================
// Parent Properties (spring.ai.openai)
// ============================================================

/**
 * Common parent properties shared by all OpenAI sub-properties.
 * Each sub-property can override apiKey, baseUrl, projectId, organizationId.
 *
 * Converted from OpenAiParentProperties.java
 */
export interface OpenAiParentProperties {
  apiKey?: string;
  baseUrl?: string;
  projectId?: string;
  organizationId?: string;
}

// ============================================================
// Connection Properties (spring.ai.openai)
// ============================================================

/**
 * OpenAI connection properties.
 *
 * Converted from OpenAiConnectionProperties.java
 * @ConfigurationProperties prefix: spring.ai.openai
 */
export interface OpenAiConnectionProperties extends OpenAiParentProperties {
  // Inherits apiKey, baseUrl (default: https://api.openai.com), projectId, organizationId
}

// ============================================================
// Chat Properties (spring.ai.openai.chat)
// ============================================================

/**
 * OpenAI Chat properties.
 *
 * Converted from OpenAiChatProperties.java
 * @ConfigurationProperties prefix: spring.ai.openai.chat
 */
export interface OpenAiChatProperties extends OpenAiParentProperties {
  completionsPath?: string;
  options?: Partial<OpenAiChatOptions>;
}

// ============================================================
// Embedding Properties (spring.ai.openai.embedding)
// ============================================================

export type MetadataMode = "EMBED" | "INFERENCE" | "NONE" | "ALL";

/**
 * OpenAI Embedding Options.
 *
 * Converted from OpenAiEmbeddingOptions.java
 */
export interface OpenAiEmbeddingOptions {
  model?: string;
  encodingFormat?: string;
  dimensions?: number;
  user?: string;
}

/**
 * OpenAI Embedding properties.
 *
 * Converted from OpenAiEmbeddingProperties.java
 * @ConfigurationProperties prefix: spring.ai.openai.embedding
 */
export interface OpenAiEmbeddingProperties extends OpenAiParentProperties {
  metadataMode?: MetadataMode;
  embeddingsPath?: string;
  options?: OpenAiEmbeddingOptions;
}

// ============================================================
// Image Properties (spring.ai.openai.image)
// ============================================================

/**
 * OpenAI Image Options.
 *
 * Converted from OpenAiImageOptions.java
 */
export interface OpenAiImageOptions {
  n?: number;
  model?: string;
  width?: number;
  height?: number;
  quality?: string;
  responseFormat?: string;
  size?: string;
  style?: string;
  user?: string;
}

/**
 * OpenAI Image properties.
 *
 * Converted from OpenAiImageProperties.java
 * @ConfigurationProperties prefix: spring.ai.openai.image
 */
export interface OpenAiImageProperties extends OpenAiParentProperties {
  imagesPath?: string;
  options?: OpenAiImageOptions;
}

// ============================================================
// Audio Speech Properties (spring.ai.openai.audio.speech)
// ============================================================

export type SpeechAudioResponseFormat =
  | "mp3"
  | "opus"
  | "aac"
  | "flac"
  | "wav"
  | "pcm";

/**
 * OpenAI Audio Speech Options.
 *
 * Converted from OpenAiAudioSpeechOptions.java
 */
export interface OpenAiAudioSpeechOptions {
  model?: string;
  input?: string;
  voice?: string;
  responseFormat?: SpeechAudioResponseFormat;
  speed?: number;
}

/**
 * OpenAI Audio Speech properties.
 *
 * Converted from OpenAiAudioSpeechProperties.java
 * @ConfigurationProperties prefix: spring.ai.openai.audio.speech
 */
export interface OpenAiAudioSpeechProperties extends OpenAiParentProperties {
  speechPath?: string;
  options?: OpenAiAudioSpeechOptions;
}

// ============================================================
// Audio Transcription Properties (spring.ai.openai.audio.transcription)
// ============================================================

export type TranscriptResponseFormat =
  | "json"
  | "text"
  | "srt"
  | "verbose_json"
  | "vtt";

export type GranularityType = "word" | "segment";

/**
 * OpenAI Audio Transcription Options.
 *
 * Converted from OpenAiAudioTranscriptionOptions.java
 */
export interface OpenAiAudioTranscriptionOptions {
  model?: string;
  responseFormat?: TranscriptResponseFormat;
  prompt?: string;
  language?: string;
  temperature?: number;
  granularityType?: GranularityType;
}

/**
 * OpenAI Audio Transcription properties.
 *
 * Converted from OpenAiAudioTranscriptionProperties.java
 * @ConfigurationProperties prefix: spring.ai.openai.audio.transcription
 */
export interface OpenAiAudioTranscriptionProperties
  extends OpenAiParentProperties {
  transcriptionPath?: string;
  options?: OpenAiAudioTranscriptionOptions;
}

// ============================================================
// Moderation Properties (spring.ai.openai.moderation)
// ============================================================

/**
 * OpenAI Moderation Options.
 *
 * Converted from OpenAiModerationOptions.java
 */
export interface OpenAiModerationOptions {
  model?: string;
}

/**
 * OpenAI Moderation properties.
 *
 * Converted from OpenAiModerationProperties.java
 * @ConfigurationProperties prefix: spring.ai.openai.moderation
 */
export interface OpenAiModerationProperties extends OpenAiParentProperties {
  moderationPath?: string;
  options?: OpenAiModerationOptions;
}

// ============================================================
// Root Properties (spring.ai.openai.*)
// ============================================================

/**
 * Root OpenAI properties that aggregates all sub-properties.
 *
 * Represents the full configuration hierarchy:
 * ```
 * spring.ai.openai.api-key
 * spring.ai.openai.base-url
 * spring.ai.openai.project-id
 * spring.ai.openai.organization-id
 * spring.ai.openai.chat.*
 * spring.ai.openai.embedding.*
 * spring.ai.openai.image.*
 * spring.ai.openai.audio.speech.*
 * spring.ai.openai.audio.transcription.*
 * spring.ai.openai.moderation.*
 * ```
 */
export interface OpenAiProperties extends OpenAiConnectionProperties {
  chat?: OpenAiChatProperties;
  embedding?: OpenAiEmbeddingProperties;
  image?: OpenAiImageProperties;
  audio?: {
    speech?: OpenAiAudioSpeechProperties;
    transcription?: OpenAiAudioTranscriptionProperties;
  };
  moderation?: OpenAiModerationProperties;
}
