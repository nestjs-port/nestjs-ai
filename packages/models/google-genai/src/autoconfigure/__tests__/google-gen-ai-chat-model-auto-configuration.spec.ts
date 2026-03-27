import { GoogleGenAI } from "@google/genai";
import { CHAT_MODEL_TOKEN } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { GoogleGenAiCachedContentService } from "../../cache";
import { GoogleGenAiChatModel } from "../../google-gen-ai-chat-model";
import type { GoogleGenAiChatOptions } from "../../google-gen-ai-chat-options";
import { configureGoogleGenAiChatModel } from "../google-gen-ai-chat-model-auto-configuration";

describe("configureGoogleGenAiChatModel", () => {
  it("registers observation, client, chat model, and cached content providers", () => {
    const configuration = configureGoogleGenAiChatModel({});
    const providers = configuration.providers ?? [];

    expect(providers).toHaveLength(4);
    expect(
      providers.some(
        (provider) =>
          typeof provider === "object" &&
          provider !== null &&
          "token" in provider &&
          provider.token === GoogleGenAI,
      ),
    ).toBe(true);
    expect(
      providers.some(
        (provider) =>
          typeof provider === "object" &&
          provider !== null &&
          "token" in provider &&
          provider.token === CHAT_MODEL_TOKEN,
      ),
    ).toBe(true);
    expect(
      providers.some(
        (provider) =>
          typeof provider === "object" &&
          provider !== null &&
          "token" in provider &&
          provider.token === GoogleGenAiCachedContentService,
      ),
    ).toBe(true);
  });

  it("omits cached content provider when disabled", () => {
    const configuration = configureGoogleGenAiChatModel({
      enableCachedContent: false,
    });
    const providers = configuration.providers ?? [];

    expect(providers).toHaveLength(3);
    expect(
      providers.some(
        (provider) =>
          typeof provider === "object" &&
          provider !== null &&
          "token" in provider &&
          provider.token === GoogleGenAiCachedContentService,
      ),
    ).toBe(false);
  });

  it("creates GoogleGenAI and GoogleGenAiChatModel from properties", () => {
    const configuration = configureGoogleGenAiChatModel({
      apiKey: "test-api-key",
      options: {
        model: "gemini-2.0-flash",
        temperature: 0.2,
        topP: 0.7,
        maxOutputTokens: 128,
      },
    });

    const providers = configuration.providers ?? [];
    const genAiProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "token" in provider &&
        provider.token === GoogleGenAI,
    );
    const chatModelProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "token" in provider &&
        provider.token === CHAT_MODEL_TOKEN,
    );

    expect(genAiProvider).toBeDefined();
    expect(chatModelProvider).toBeDefined();

    const genAiClient = (
      genAiProvider as unknown as {
        useFactory: () => GoogleGenAI;
      }
    ).useFactory();

    expect(genAiClient.vertexai).toBe(false);

    const googleGenAiChatModel = (
      chatModelProvider as unknown as {
        useFactory: (genAiClient: GoogleGenAI) => GoogleGenAiChatModel;
      }
    ).useFactory(genAiClient);

    expect(googleGenAiChatModel).toBeInstanceOf(GoogleGenAiChatModel);

    const defaultOptions =
      googleGenAiChatModel.defaultOptions as GoogleGenAiChatOptions;
    expect(defaultOptions.model).toBe("gemini-2.0-flash");
    expect(defaultOptions.temperature).toBe(0.2);
    expect(defaultOptions.topP).toBe(0.7);
    expect(defaultOptions.maxOutputTokens).toBe(128);
  });

  it("creates vertex ai client when apiKey is not provided", () => {
    const configuration = configureGoogleGenAiChatModel({
      projectId: "test-project",
      location: "us-central1",
    });

    const providers = configuration.providers ?? [];
    const genAiProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "token" in provider &&
        provider.token === GoogleGenAI,
    );

    expect(genAiProvider).toBeDefined();

    const genAiClient = (
      genAiProvider as unknown as {
        useFactory: () => GoogleGenAI;
      }
    ).useFactory();

    expect(genAiClient.vertexai).toBe(true);
  });
});
