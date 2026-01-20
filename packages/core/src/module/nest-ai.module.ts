import type { DynamicModule, Provider } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { CHAT_MODEL_TOKEN } from "../constants";
import { createChatModel } from "./create-chat-model";
import type { NestAIModuleOptions } from "./nest-ai-module.options";

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS modules use static methods for configuration
export class NestAIModule {
	static forRoot(options: NestAIModuleOptions): DynamicModule {
		const providers: Provider[] = [];

		if (options.chatModel) {
			providers.push({
				provide: CHAT_MODEL_TOKEN,
				useValue: createChatModel(options.chatModel),
			});
		}

		const exports = options.chatModel ? [CHAT_MODEL_TOKEN] : [];

		return {
			module: NestAIModule,
			providers,
			exports,
			global: true,
		};
	}
}
