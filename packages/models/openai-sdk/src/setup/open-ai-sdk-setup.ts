/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { LoggerFactory, type Milliseconds, ms } from "@nestjs-ai/commons";
import type { ClientOptions } from "openai";
import OpenAI, { AzureOpenAI } from "openai";

export interface OpenAiSdkSetupProps {
  baseUrl?: string | null;
  apiKey?: string | null;
  azureADTokenProvider?: (() => Promise<string>) | null;
  azureDeploymentName?: string | null;
  azureOpenAiServiceVersion?: unknown;
  organizationId?: string | null;
  isAzure?: boolean;
  isGitHubModels?: boolean;
  modelName?: string | null;
  timeout?: Milliseconds;
  maxRetries?: number | null;
  fetchOptions?: ClientOptions["fetchOptions"] | null;
  customHeaders?: Record<string, string> | null;
}

export enum ModelProvider {
  OPEN_AI = "OPEN_AI",
  MICROSOFT_FOUNDRY = "MICROSOFT_FOUNDRY",
  GITHUB_MODELS = "GITHUB_MODELS",
}

export class OpenAiSdkSetup {
  static readonly OPENAI_URL = "https://api.openai.com/v1";
  static readonly OPENAI_API_KEY = "OPENAI_API_KEY";
  static readonly MICROSOFT_FOUNDRY_API_KEY = "MICROSOFT_FOUNDRY_API_KEY";
  static readonly GITHUB_MODELS_URL = "https://models.github.ai/inference";
  static readonly GITHUB_TOKEN = "GITHUB_TOKEN";
  static readonly DEFAULT_USER_AGENT = "spring-ai-openai-sdk";

  private static readonly DEFAULT_DURATION: Milliseconds = ms(60_000);
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly logger = LoggerFactory.getLogger(OpenAiSdkSetup.name);

  private constructor() {}

  static setupClient(props: OpenAiSdkSetupProps): OpenAI | AzureOpenAI {
    const baseUrl = OpenAiSdkSetup.detectBaseUrlFromEnv(props.baseUrl ?? null);
    const azureOpenAiServiceVersion =
      typeof props.azureOpenAiServiceVersion === "string"
        ? props.azureOpenAiServiceVersion
        : null;
    const modelProvider = OpenAiSdkSetup.detectModelProvider(
      props.isAzure ?? false,
      props.isGitHubModels ?? false,
      baseUrl,
      props.azureDeploymentName ?? null,
      azureOpenAiServiceVersion,
    );
    const timeout = props.timeout ?? OpenAiSdkSetup.DEFAULT_DURATION;
    const maxRetries = props.maxRetries ?? OpenAiSdkSetup.DEFAULT_MAX_RETRIES;
    const calculatedBaseUrl = OpenAiSdkSetup.calculateBaseUrl(
      baseUrl,
      modelProvider,
      props.modelName ?? null,
      props.azureDeploymentName ?? null,
    );
    const calculatedApiKey =
      props.apiKey ?? OpenAiSdkSetup.detectApiKey(modelProvider) ?? undefined;
    const authProvider =
      props.azureADTokenProvider ?? OpenAiSdkSetup.azureAuthentication();
    const azureADTokenProvider =
      calculatedApiKey == null ? authProvider : undefined;
    const defaultHeaders = {
      "User-Agent": OpenAiSdkSetup.DEFAULT_USER_AGENT,
    } as Record<string, string>;

    if (props.customHeaders != null) {
      Object.assign(defaultHeaders, props.customHeaders);
    }

    const fetchOptions = props.fetchOptions ?? undefined;

    if (modelProvider === ModelProvider.MICROSOFT_FOUNDRY) {
      return new AzureOpenAI({
        baseURL: calculatedBaseUrl,
        apiKey: calculatedApiKey,
        apiVersion: azureOpenAiServiceVersion ?? undefined,
        organization: props.organizationId ?? undefined,
        azureADTokenProvider,
        timeout,
        maxRetries,
        defaultHeaders,
        fetchOptions,
      });
    }

    return new OpenAI({
      baseURL: calculatedBaseUrl,
      apiKey: calculatedApiKey,
      organization: props.organizationId ?? undefined,
      timeout,
      maxRetries,
      defaultHeaders,
      fetchOptions,
    });
  }

  static detectBaseUrlFromEnv(baseUrl: string | null): string | null {
    if (baseUrl == null) {
      const openAiBaseUrl = process.env.OPENAI_BASE_URL;
      if (openAiBaseUrl != null) {
        baseUrl = openAiBaseUrl;
        OpenAiSdkSetup.logger.debug(
          "OpenAI Base URL detected from environment variable OPENAI_BASE_URL.",
        );
      }

      const azureOpenAiBaseUrl = process.env.AZURE_OPENAI_BASE_URL;
      if (azureOpenAiBaseUrl != null) {
        baseUrl = azureOpenAiBaseUrl;
        OpenAiSdkSetup.logger.debug(
          "Microsoft Foundry Base URL detected from environment variable AZURE_OPENAI_BASE_URL.",
        );
      }
    }
    return baseUrl;
  }

  static detectModelProvider(
    isMicrosoftFoundry: boolean,
    isGitHubModels: boolean,
    baseUrl: string | null,
    azureDeploymentName: string | null,
    azureOpenAIServiceVersion: unknown,
  ): ModelProvider {
    if (isMicrosoftFoundry) {
      return ModelProvider.MICROSOFT_FOUNDRY; // Forced by the user
    }
    if (isGitHubModels) {
      return ModelProvider.GITHUB_MODELS; // Forced by the user
    }
    if (baseUrl != null) {
      if (
        baseUrl.endsWith("openai.azure.com") ||
        baseUrl.endsWith("openai.azure.com/") ||
        baseUrl.endsWith("cognitiveservices.azure.com") ||
        baseUrl.endsWith("cognitiveservices.azure.com/")
      ) {
        return ModelProvider.MICROSOFT_FOUNDRY;
      }
      if (baseUrl.startsWith(OpenAiSdkSetup.GITHUB_MODELS_URL)) {
        return ModelProvider.GITHUB_MODELS;
      }
    }
    if (azureDeploymentName != null || azureOpenAIServiceVersion != null) {
      return ModelProvider.MICROSOFT_FOUNDRY;
    }
    return ModelProvider.OPEN_AI;
  }

  static calculateBaseUrl(
    baseUrl: string | null,
    modelProvider: ModelProvider,
    modelName: string | null,
    azureDeploymentName: string | null,
  ): string {
    if (modelProvider === ModelProvider.OPEN_AI) {
      return baseUrl == null || baseUrl.trim().length === 0
        ? OpenAiSdkSetup.OPENAI_URL
        : baseUrl;
    }

    if (modelProvider === ModelProvider.GITHUB_MODELS) {
      if (baseUrl == null || baseUrl.trim().length === 0) {
        return OpenAiSdkSetup.GITHUB_MODELS_URL;
      }
      if (baseUrl.startsWith(OpenAiSdkSetup.GITHUB_MODELS_URL)) {
        // To support GitHub Models for specific orgs
        return baseUrl;
      }
      return OpenAiSdkSetup.GITHUB_MODELS_URL;
    }

    if (modelProvider === ModelProvider.MICROSOFT_FOUNDRY) {
      if (baseUrl == null || baseUrl.trim().length === 0) {
        throw new Error("Base URL must be provided for Microsoft Foundry.");
      }

      let calculatedBaseUrl = baseUrl;
      if (calculatedBaseUrl.endsWith("/") || calculatedBaseUrl.endsWith("?")) {
        calculatedBaseUrl = calculatedBaseUrl.slice(0, -1);
      }

      // If the Azure deployment name is not configured, the model name will be used
      // by default by the OpenAI SDK
      if (azureDeploymentName != null && azureDeploymentName !== modelName) {
        calculatedBaseUrl += `/openai/deployments/${azureDeploymentName}`;
      }
      return calculatedBaseUrl;
    }

    throw new Error(`Unknown model provider: ${modelProvider}`);
  }

  static azureAuthentication(): () => Promise<string> {
    let credentialProviderPromise: Promise<() => Promise<string>> | null = null;

    return async () => {
      credentialProviderPromise ??= import(
        "./azure-internal-open-ai-sdk-helper"
      ).then(({ AzureInternalOpenAiSdkHelper }) =>
        AzureInternalOpenAiSdkHelper.getAzureCredential(),
      );

      try {
        return await (await credentialProviderPromise)();
      } catch {
        throw new Error(
          "Microsoft Foundry was detected, but no credential was provided. If you want to use passwordless authentication, add the @azure/identity dependency to your project.",
        );
      }
    };
  }

  static detectApiKey(modelProvider: ModelProvider): string | null {
    if (
      modelProvider === ModelProvider.OPEN_AI &&
      process.env[OpenAiSdkSetup.OPENAI_API_KEY] != null
    ) {
      return process.env[OpenAiSdkSetup.OPENAI_API_KEY] ?? null;
    }

    if (
      modelProvider === ModelProvider.MICROSOFT_FOUNDRY &&
      process.env[OpenAiSdkSetup.MICROSOFT_FOUNDRY_API_KEY] != null
    ) {
      return process.env[OpenAiSdkSetup.MICROSOFT_FOUNDRY_API_KEY] ?? null;
    }

    if (
      modelProvider === ModelProvider.MICROSOFT_FOUNDRY &&
      process.env[OpenAiSdkSetup.OPENAI_API_KEY] != null
    ) {
      return process.env[OpenAiSdkSetup.OPENAI_API_KEY] ?? null;
    }

    if (
      modelProvider === ModelProvider.GITHUB_MODELS &&
      process.env[OpenAiSdkSetup.GITHUB_TOKEN] != null
    ) {
      return process.env[OpenAiSdkSetup.GITHUB_TOKEN] ?? null;
    }

    return null;
  }
}
