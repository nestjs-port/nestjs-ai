import type { DynamicModule, InjectionToken, Provider } from "@nestjs/common";
import { Module, Scope } from "@nestjs/common";
import {
  type ChatClientConfiguration,
  type ChatModelConfiguration,
  FetchHttpClient,
  HTTP_CLIENT_TOKEN,
  type Logger,
  LoggerFactory,
  type ObservationConfiguration,
  ObservationHandlers,
  PROVIDER_INSTANCE_EXPLORER_TOKEN,
} from "@nestjs-ai/commons";
import { NestLoggerFactory } from "../logging";
import { NestProviderInstanceExplorer } from "../provider";
import type { NestAiModuleOptions } from "./nest-ai-module.options";

@Module({})
export class NestAiModule {
  private static readonly logger: Logger = LoggerFactory.getLogger(
    NestAiModule.name,
  );

  static forRoot(options: NestAiModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [];
    const exports: InjectionToken[] = [];

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
      options.chatClient,
    );
    NestAiModule.registerConfigurationProviders(
      providers,
      exports,
      options.observation,
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
      | ChatClientConfiguration
      | ObservationConfiguration,
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

  private static addProviderIfMissing(
    providers: Provider[],
    exports: InjectionToken[],
    provider: Provider,
    token: InjectionToken,
  ): void {
    if (NestAiModule.hasProviderToken(providers, token)) {
      NestAiModule.logger.warn(
        `Provider token already registered. Skipping duplicate provider registration: ${String(token)}`,
      );
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
