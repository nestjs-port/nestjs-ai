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

import { type Milliseconds, ms } from "@nestjs-ai/commons";
import type { ClientOptions } from "openai";

export interface AbstractOpenAiSdkOptionsProps {
  /**
   * The deployment URL to connect to OpenAI.
   */
  baseUrl?: string | null;

  /**
   * The API key to connect to OpenAI.
   */
  apiKey?: string | null;

  /**
   * Azure Active Directory token provider used to connect to Microsoft Foundry.
   */
  azureADTokenProvider?: (() => Promise<string>) | null;

  /**
   * The model name used. When using Microsoft Foundry, this is also used as the
   * default deployment name.
   */
  model?: string | null;

  /**
   * The deployment name as defined in Microsoft Foundry. On Microsoft Foundry, the
   * default deployment name is the same as the model name. When using OpenAI directly,
   * this value isn't used.
   */
  deploymentName?: string | null;

  /**
   * The service version to use when connecting to Microsoft Foundry.
   */
  microsoftFoundryServiceVersion?: unknown;

  /**
   * The organization ID to use when connecting to Microsoft Foundry.
   */
  organizationId?: string | null;

  /**
   * Whether Microsoft Foundry is detected.
   */
  microsoftFoundry?: boolean;

  /**
   * Whether GitHub Models is detected.
   */
  gitHubModels?: boolean;

  /**
   * Request timeout for OpenAI client.
   */
  timeout?: Milliseconds;

  /**
   * Maximum number of retries for OpenAI client.
   */
  maxRetries?: number | null;

  /**
   * Fetch options for OpenAI client requests.
   */
  fetchOptions?: ClientOptions["fetchOptions"] | null;

  /**
   * Custom HTTP headers to add to OpenAI client requests.
   */
  customHeaders?: Record<string, string> | null;
}

export class AbstractOpenAiSdkOptions {
  static readonly DEFAULT_TIMEOUT: Milliseconds = ms(60_000);
  static readonly DEFAULT_MAX_RETRIES = 3;

  private _baseUrl: string | null = null;
  private _apiKey: string | null = null;
  private _azureADTokenProvider: (() => Promise<string>) | null = null;
  private _model: string | null = null;
  private _deploymentName: string | null = null;
  private _microsoftFoundryServiceVersion: unknown = null;
  private _organizationId: string | null = null;
  private _microsoftFoundry = false;
  private _gitHubModels = false;
  private _timeout: Milliseconds | null = null;
  private _maxRetries: number | null = null;
  private _fetchOptions: ClientOptions["fetchOptions"] | null = null;
  private _customHeaders: Record<string, string> = {};

  constructor(props: AbstractOpenAiSdkOptionsProps = {}) {
    this._baseUrl = props.baseUrl ?? null;
    this._apiKey = props.apiKey ?? null;
    this._azureADTokenProvider = props.azureADTokenProvider ?? null;
    this._model = props.model ?? null;
    this._deploymentName = props.deploymentName ?? null;
    this._microsoftFoundryServiceVersion =
      props.microsoftFoundryServiceVersion ?? null;
    this._organizationId = props.organizationId ?? null;
    this._microsoftFoundry = props.microsoftFoundry ?? false;
    this._gitHubModels = props.gitHubModels ?? false;
    this._timeout = props.timeout ?? null;
    this._maxRetries = props.maxRetries ?? null;
    this._fetchOptions = props.fetchOptions ?? null;
    this._customHeaders = { ...(props.customHeaders ?? {}) };
  }

  get baseUrl(): string | null {
    return this._baseUrl;
  }

  setBaseUrl(baseUrl: string | null): void {
    this._baseUrl = baseUrl ?? null;
  }

  get apiKey(): string | null {
    return this._apiKey;
  }

  setApiKey(apiKey: string | null): void {
    this._apiKey = apiKey ?? null;
  }

  get azureADTokenProvider(): (() => Promise<string>) | null {
    return this._azureADTokenProvider;
  }

  setAzureADTokenProvider(
    azureADTokenProvider: (() => Promise<string>) | null,
  ): void {
    this._azureADTokenProvider = azureADTokenProvider;
  }

  get model(): string | null {
    return this._model;
  }

  setModel(model: string | null): void {
    this._model = model ?? null;
  }

  get deploymentName(): string | null {
    return this._deploymentName;
  }

  setDeploymentName(deploymentName: string | null): void {
    this._deploymentName = deploymentName ?? null;
  }

  get microsoftFoundryServiceVersion(): unknown {
    return this._microsoftFoundryServiceVersion;
  }

  setMicrosoftFoundryServiceVersion(
    microsoftFoundryServiceVersion: unknown,
  ): void {
    this._microsoftFoundryServiceVersion = microsoftFoundryServiceVersion;
  }

  get organizationId(): string | null {
    return this._organizationId;
  }

  setOrganizationId(organizationId: string | null): void {
    this._organizationId = organizationId ?? null;
  }

  get microsoftFoundry(): boolean {
    return this._microsoftFoundry;
  }

  setMicrosoftFoundry(microsoftFoundry: boolean): void {
    this._microsoftFoundry = microsoftFoundry;
  }

  get gitHubModels(): boolean {
    return this._gitHubModels;
  }

  setGitHubModels(gitHubModels: boolean): void {
    this._gitHubModels = gitHubModels;
  }

  get timeout(): Milliseconds | null {
    return this._timeout;
  }

  setTimeout(timeout: Milliseconds | null): void {
    this._timeout = timeout;
  }

  get maxRetries(): number | null {
    return this._maxRetries;
  }

  setMaxRetries(maxRetries: number | null): void {
    this._maxRetries = maxRetries ?? null;
  }

  get fetchOptions(): ClientOptions["fetchOptions"] | null {
    return this._fetchOptions;
  }

  setFetchOptions(fetchOptions: ClientOptions["fetchOptions"] | null): void {
    this._fetchOptions = fetchOptions;
  }

  get customHeaders(): Record<string, string> {
    return this._customHeaders;
  }

  setCustomHeaders(customHeaders: Record<string, string> | null): void {
    this._customHeaders = { ...(customHeaders ?? {}) };
  }
}
