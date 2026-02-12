import type { ChatModelFactory, HttpClient } from "@nestjs-ai/commons";

export interface NestAIModuleOptions {
	chatModel?: ChatModelFactory;
	httpClient?: HttpClient;
}
