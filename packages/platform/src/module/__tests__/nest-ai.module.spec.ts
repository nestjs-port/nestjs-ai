import type { ChatClientConfiguration } from "@nestjs-ai/commons";
import {
  HTTP_CLIENT_TOKEN,
  type ObservationConfiguration,
  ObservationHandlers,
  PROVIDER_INSTANCE_EXPLORER_TOKEN,
} from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
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

  it("uses user provider when same token is provided in forRoot options", () => {
    const customHttpClient = { name: "custom-http-client" };
    const dynamicModule = NestAiModule.forRoot({
      providers: [
        {
          provide: HTTP_CLIENT_TOKEN,
          useValue: customHttpClient,
        },
      ],
    });

    const providers = dynamicModule.providers ?? [];
    const httpClientProviders = providers.filter(
      (provider) =>
        typeof provider === "object" &&
        provider != null &&
        "provide" in provider &&
        provider.provide === HTTP_CLIENT_TOKEN,
    );

    expect(httpClientProviders).toHaveLength(1);
    expect(
      typeof httpClientProviders[0] === "object" &&
        httpClientProviders[0] != null &&
        "useValue" in httpClientProviders[0]
        ? httpClientProviders[0].useValue
        : undefined,
    ).toBe(customHttpClient);
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

  it("detects duplicate token from user class shorthand providers", () => {
    class CustomProvider {}

    const dynamicModule = NestAiModule.forRoot({
      providers: [CustomProvider],
      observation: {
        providers: [
          {
            token: CustomProvider,
            useFactory: () => "override",
          },
        ],
      } as unknown as ObservationConfiguration,
    });

    const providers = dynamicModule.providers ?? [];
    const customProviders = providers.filter((provider) => {
      if (typeof provider === "function") {
        return provider === CustomProvider;
      }
      if (typeof provider !== "object" || provider == null) {
        return false;
      }
      return "provide" in provider && provider.provide === CustomProvider;
    });

    expect(customProviders).toHaveLength(1);
    expect(customProviders[0]).toBe(CustomProvider);
  });
});
