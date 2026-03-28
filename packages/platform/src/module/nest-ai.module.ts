import type { DynamicModule, InjectionToken, Provider } from "@nestjs/common";
import { Module, Scope } from "@nestjs/common";
import {
  type ChatClientConfiguration,
  type ChatMemoryConfiguration,
  type ChatModelConfiguration,
  type EmbeddingModelConfiguration,
  FetchHttpClient,
  HTTP_CLIENT_TOKEN,
  LoggerFactory,
  type ObservationConfiguration,
  ObservationHandlers,
  PROVIDER_INSTANCE_EXPLORER_TOKEN,
  type VectorStoreConfiguration,
} from "@nestjs-ai/commons";
import { NestLoggerFactory } from "../logging";
import { NestProviderInstanceExplorer } from "../provider";
import type { NestAiModuleOptions } from "./nest-ai-module.options";

@Module({})
export class NestAiModule {
  static forRoot(options: NestAiModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [];
    const exports: InjectionToken[] = [];

    NestAiModule.registerUserProviders(providers, exports, options.providers);

    NestAiModule.addProviderIfMissing(
      providers,
      exports,
      {
        provide: HTTP_CLIENT_TOKEN,
        useValue: options.httpClient ?? new FetchHttpClient(),
      },
      HTTP_CLIENT_TOKEN,
    );
    NestAiModule.addProviderIfMissing(
      providers,
      exports,
      {
        provide: ObservationHandlers,
        useValue: new ObservationHandlers(),
      },
      ObservationHandlers,
    );
    NestAiModule.addProviderIfMissing(
      providers,
      exports,
      {
        provide: PROVIDER_INSTANCE_EXPLORER_TOKEN,
        useClass: NestProviderInstanceExplorer,
      },
      PROVIDER_INSTANCE_EXPLORER_TOKEN,
    );

    NestAiModule.registerConfigurationProviders(
      providers,
      exports,
      options.chatModel,
    );
    NestAiModule.registerConfigurationProviders(
      providers,
      exports,
      options.embeddingModel,
    );
    NestAiModule.registerConfigurationProviders(
      providers,
      exports,
      options.chatClient,
    );
    NestAiModule.registerConfigurationProviders(
      providers,
      exports,
      options.chatMemory,
    );
    NestAiModule.registerConfigurationProviders(
      providers,
      exports,
      options.observation,
    );
    NestAiModule.registerConfigurationProviders(
      providers,
      exports,
      options.vectorStore,
    );

    LoggerFactory.bind(new NestLoggerFactory());

    return {
      module: NestAiModule,
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
      | EmbeddingModelConfiguration
      | ChatClientConfiguration
      | ChatMemoryConfiguration
      | ObservationConfiguration
      | VectorStoreConfiguration,
  ): void {
    if (configuration == null) {
      return;
    }

    for (const provider of configuration.providers) {
      const scope =
        "scope" in provider
          ? NestAiModule.toProviderScope(provider.scope)
          : undefined;

      const token = provider.token as InjectionToken;
      NestAiModule.addProviderIfMissing(
        providers,
        exports,
        {
          provide: token,
          useFactory: provider.useFactory,
          inject: (provider.inject ?? []) as InjectionToken[],
          scope,
        },
        token,
      );
    }
  }

  private static registerUserProviders(
    providers: Provider[],
    exports: InjectionToken[],
    userProviders: Provider[] | undefined,
  ): void {
    if (userProviders == null) {
      return;
    }

    for (const provider of userProviders) {
      const token = NestAiModule.resolveProviderToken(provider);
      if (token == null) {
        continue;
      }
      NestAiModule.addProviderIfMissing(providers, exports, provider, token);
    }
  }

  private static resolveProviderToken(
    provider: Provider,
  ): InjectionToken | null {
    if (typeof provider === "function") {
      return provider as InjectionToken;
    }
    if (typeof provider !== "object" || provider == null) {
      return null;
    }
    if (!("provide" in provider)) {
      return null;
    }
    return provider.provide as InjectionToken;
  }

  private static addProviderIfMissing(
    providers: Provider[],
    exports: InjectionToken[],
    provider: Provider,
    token: InjectionToken,
  ): void {
    if (NestAiModule.hasProviderToken(providers, token)) {
      return;
    }
    providers.push(provider);
    exports.push(token);
  }

  private static hasProviderToken(
    providers: Provider[],
    token: InjectionToken,
  ): boolean {
    return providers.some((provider) => {
      if (typeof provider === "function") {
        return provider === token;
      }
      if (typeof provider !== "object" || provider == null) {
        return false;
      }
      return "provide" in provider && provider.provide === token;
    });
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
