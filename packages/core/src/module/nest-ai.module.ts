import type {
  DynamicModule,
  InjectionToken,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";
import { Module } from "@nestjs/common";
import {
  type ChatClientConfiguration,
  type ChatModelConfiguration,
  FetchHttpClient,
  HTTP_CLIENT_TOKEN,
  LoggerFactory,
} from "@nestjs-ai/commons";
import { NestLoggerFactory } from "../logging";
import type { NestAIModuleOptions } from "./nest-ai-module.options";

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS modules use static methods for configuration
export class NestAIModule {
  static forRoot(options: NestAIModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [];
    const exports: InjectionToken[] = [];

    providers.push({
      provide: HTTP_CLIENT_TOKEN,
      useValue: options.httpClient ?? new FetchHttpClient(),
    });
    exports.push(HTTP_CLIENT_TOKEN);

    NestAIModule.registerConfigurationProviders(
      providers,
      exports,
      options.chatModel,
    );
    NestAIModule.registerConfigurationProviders(
      providers,
      exports,
      options.chatClient,
    );

    LoggerFactory.bind(new NestLoggerFactory());

    return {
      module: NestAIModule,
      providers,
      exports,
      global: options.global ?? true,
    };
  }

  private static registerConfigurationProviders(
    providers: Provider[],
    exports: InjectionToken[],
    configuration?: ChatModelConfiguration | ChatClientConfiguration,
  ): void {
    if (configuration == null) {
      return;
    }

    for (const { token, useFactory, inject } of configuration.providers) {
      providers.push({
        provide: token as InjectionToken,
        useFactory,
        inject: (inject ?? []) as InjectionToken[],
      });
      exports.push(token as InjectionToken);
    }
  }
}
