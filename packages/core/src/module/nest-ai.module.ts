import type { DynamicModule, Provider } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { FetchHttpClient, LoggerFactory } from "@nestjs-ai/commons";
import { CHAT_MODEL_TOKEN, HTTP_CLIENT_TOKEN } from "../constants";
import { NestLoggerFactory } from "../logging";
import { createChatModel } from "./create-chat-model";
import type { NestAIModuleOptions } from "./nest-ai-module.options";

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS modules use static methods for configuration
export class NestAIModule {
	static forRoot(options: NestAIModuleOptions = {}): DynamicModule {
		const providers: Provider[] = [];
		const exports: symbol[] = [];

		providers.push({
			provide: HTTP_CLIENT_TOKEN,
			useValue: options.httpClient ?? new FetchHttpClient(),
		});
		exports.push(HTTP_CLIENT_TOKEN);

		if (options.chatModel) {
			providers.push({
				provide: CHAT_MODEL_TOKEN,
				useValue: createChatModel(options.chatModel),
			});
			exports.push(CHAT_MODEL_TOKEN);
		}

		LoggerFactory.bind(new NestLoggerFactory());

		return {
			module: NestAIModule,
			providers,
			exports,
			global: true,
		};
	}
}
