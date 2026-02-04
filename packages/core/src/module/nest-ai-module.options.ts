import type { HttpClient } from "@nestjs-ai/commons";
import type { ChatModelType } from "../types";

export interface NestAIModuleOptions {
	chatModel?: ChatModelType;
	httpClient?: HttpClient;
}
