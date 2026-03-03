import type { ChatClientConfiguration } from "@nestjs-ai/commons";
import {
  HTTP_CLIENT_TOKEN,
  type ObservationConfiguration,
  ObservationHandlers,
  PROVIDER_INSTANCE_EXPLORER_TOKEN,
} from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { NestProviderInstanceExplorer } from "../../provider";
import { NestAiModule } from "../nest-ai.module";

describe("NestAIModule", () => {
  it("registers default HTTP client provider in forRoot", () => {
    const dynamicModule = NestAiModule.forRoot();
    const providers = dynamicModule.providers ?? [];
    const exportsList = dynamicModule.exports ?? [];

    expect(dynamicModule.module).toBe(NestAiModule);
    expect(dynamicModule.global).toBe(true);

    const httpClientProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === HTTP_CLIENT_TOKEN,
    );

    expect(httpClientProvider).toBeDefined();
    expect(
      typeof httpClientProvider === "object" &&
        httpClientProvider !== null &&
        "useValue" in httpClientProvider,
    ).toBe(true);
    expect(exportsList).toContain(HTTP_CLIENT_TOKEN);
  });

  it("registers observation handlers provider and export", () => {
    const dynamicModule = NestAiModule.forRoot();
    const providers = dynamicModule.providers ?? [];
    const exportsList = dynamicModule.exports ?? [];

    const observationHandlersProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === ObservationHandlers,
    );

    expect(observationHandlersProvider).toBeDefined();
    expect(exportsList).toContain(ObservationHandlers);
  });

  it("registers chat client providers and exports", () => {
    const CHAT_CLIENT_TOKEN = Symbol("CHAT_CLIENT_TOKEN");
    const dynamicModule = NestAiModule.forRoot({
      chatClient: {
        providers: [
          {
            token: CHAT_CLIENT_TOKEN,
            useFactory: () => "chat-client",
          },
        ],
      } as unknown as ChatClientConfiguration,
    });
    const providers = dynamicModule.providers ?? [];
    const exportsList = dynamicModule.exports ?? [];

    const chatClientProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === CHAT_CLIENT_TOKEN,
    );

    expect(chatClientProvider).toBeDefined();
    expect(exportsList).toContain(CHAT_CLIENT_TOKEN);
  });

  it("uses module global option when provided", () => {
    const dynamicModule = NestAiModule.forRoot({ global: false });
    expect(dynamicModule.global).toBe(false);
  });

  it("keeps first provider when duplicate token is configured", () => {
    const dynamicModule = NestAiModule.forRoot({
      observation: {
        providers: [
          {
            token: PROVIDER_INSTANCE_EXPLORER_TOKEN,
            useFactory: () => "override",
          },
        ],
      } as unknown as ObservationConfiguration,
    });

    const providers = dynamicModule.providers ?? [];
    const duplicateProviders = providers.filter(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === PROVIDER_INSTANCE_EXPLORER_TOKEN,
    );

    expect(duplicateProviders).toHaveLength(1);
  });

  it("treats class shorthand providers as duplicate tokens", () => {
    const hasProviderToken = Reflect.get(NestAiModule, "hasProviderToken") as (
      providers: unknown[],
      token: unknown,
    ) => boolean;

    const duplicated = hasProviderToken(
      [NestProviderInstanceExplorer],
      NestProviderInstanceExplorer,
    );

    expect(duplicated).toBe(true);
  });
});
