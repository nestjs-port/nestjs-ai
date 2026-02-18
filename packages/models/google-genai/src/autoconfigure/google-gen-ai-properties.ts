import type { GoogleGenAiChatOptions } from "../google-gen-ai-chat-options";

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
