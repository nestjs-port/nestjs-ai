import type { ChatClientConfiguration } from "@nestjs-ai/commons";
import { HTTP_CLIENT_TOKEN } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { NestAIModule } from "../nest-ai.module";

describe("NestAIModule", () => {
  it("registers default HTTP client provider in forRoot", () => {
    const dynamicModule = NestAIModule.forRoot();
    const providers = dynamicModule.providers ?? [];
    const exportsList = dynamicModule.exports ?? [];

    expect(dynamicModule.module).toBe(NestAIModule);
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

  it("registers chat client providers and exports", () => {
    const CHAT_CLIENT_TOKEN = Symbol("CHAT_CLIENT_TOKEN");
    const dynamicModule = NestAIModule.forRoot({
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
    const dynamicModule = NestAIModule.forRoot({ global: false });
    expect(dynamicModule.global).toBe(false);
  });
});
