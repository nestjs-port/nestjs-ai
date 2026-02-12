import type {
	DynamicModule,
	InjectionToken,
	ModuleMetadata,
	Provider,
} from "@nestjs/common";
import { Module } from "@nestjs/common";
import { FetchHttpClient, LoggerFactory } from "@nestjs-ai/commons";
import { HTTP_CLIENT_TOKEN } from "../constants";
import { NestLoggerFactory } from "../logging";
import type { NestAIModuleOptions } from "./nest-ai-module.options";

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS modules use static methods for configuration
export class NestAIModule {
	static forRoot(options: NestAIModuleOptions = {}): DynamicModule {
		const providers: Provider[] = [];
		const exports: ModuleMetadata["exports"] = [];

		providers.push({
			provide: HTTP_CLIENT_TOKEN,
			useValue: options.httpClient ?? new FetchHttpClient(),
		});
		exports.push(HTTP_CLIENT_TOKEN);

		if (options.chatModel) {
			for (const { token, useFactory, inject } of options.chatModel.providers) {
				providers.push({
					provide: token as InjectionToken,
					useFactory,
					inject: (inject ?? []) as InjectionToken[],
				});
				exports.push(token as InjectionToken);
			}
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
