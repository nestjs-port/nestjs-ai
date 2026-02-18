import type { DynamicModule, InjectionToken, Provider } from "@nestjs/common";
import { Module, Scope } from "@nestjs/common";
import {
  type ChatClientConfiguration,
  type ChatModelConfiguration,
  FetchHttpClient,
  HTTP_CLIENT_TOKEN,
  LoggerFactory,
  type ObservationConfiguration,
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
    NestAIModule.registerConfigurationProviders(
      providers,
      exports,
      options.observation,
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
    configuration?:
      | ChatModelConfiguration
      | ChatClientConfiguration
      | ObservationConfiguration,
  ): void {
    if (configuration == null) {
      return;
    }

    for (const provider of configuration.providers) {
      const scope =
        "scope" in provider
          ? NestAIModule.toProviderScope(provider.scope)
          : undefined;

      providers.push({
        provide: provider.token as InjectionToken,
        useFactory: provider.useFactory,
        inject: (provider.inject ?? []) as InjectionToken[],
        scope,
      });
      exports.push(provider.token as InjectionToken);
    }
  }

  private static toProviderScope(scope: unknown): Scope | undefined {
    switch (scope) {
      case "DEFAULT":
        return Scope.DEFAULT;
      case "TRANSIENT":
        return Scope.TRANSIENT;
      case "REQUEST":
        return Scope.REQUEST;
      default:
        return undefined;
    }
  }
}
