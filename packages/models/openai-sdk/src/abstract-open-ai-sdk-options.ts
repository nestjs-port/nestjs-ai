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

import type { TokenCredential } from "@azure/identity";

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
   * Credentials used to connect to Microsoft Foundry.
   */
  credential?: TokenCredential | null;

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
  timeout?: unknown;

  /**
   * Maximum number of retries for OpenAI client.
   */
  maxRetries?: number | null;

  /**
   * Proxy settings for OpenAI client.
   */
  proxy?: unknown;

  /**
   * Custom HTTP headers to add to OpenAI client requests.
   */
  customHeaders?: Record<string, string> | null;
}

export class AbstractOpenAiSdkOptions {
  private _baseUrl: string | null = null;
  private _apiKey: string | null = null;
  private _credential: TokenCredential | null = null;
  private _model: string | null = null;
  private _deploymentName: string | null = null;
  private _microsoftFoundryServiceVersion: unknown = null;
  private _organizationId: string | null = null;
  private _microsoftFoundry = false;
  private _gitHubModels = false;
  private _timeout: unknown = null;
  private _maxRetries: number | null = null;
  private _proxy: unknown = null;
  private _customHeaders: Record<string, string> = {};

  constructor(props: AbstractOpenAiSdkOptionsProps = {}) {
    this._baseUrl = props.baseUrl ?? null;
    this._apiKey = props.apiKey ?? null;
    this._credential = props.credential ?? null;
    this._model = props.model ?? null;
    this._deploymentName = props.deploymentName ?? null;
    this._microsoftFoundryServiceVersion =
      props.microsoftFoundryServiceVersion ?? null;
    this._organizationId = props.organizationId ?? null;
    this._microsoftFoundry = props.microsoftFoundry ?? false;
    this._gitHubModels = props.gitHubModels ?? false;
    this._timeout = props.timeout ?? null;
    this._maxRetries = props.maxRetries ?? null;
    this._proxy = props.proxy ?? null;
    this._customHeaders = { ...(props.customHeaders ?? {}) };
  }

  get baseUrl(): string | null {
    return this._baseUrl;
  }

  set baseUrl(baseUrl: string | null) {
    this._baseUrl = baseUrl ?? null;
  }

  get apiKey(): string | null {
    return this._apiKey;
  }

  set apiKey(apiKey: string | null) {
    this._apiKey = apiKey ?? null;
  }

  get credential(): TokenCredential | null {
    return this._credential;
  }

  set credential(credential: TokenCredential | null) {
    this._credential = credential;
  }

  get model(): string | null {
    return this._model;
  }

  set model(model: string | null) {
    this._model = model ?? null;
  }

  get deploymentName(): string | null {
    return this._deploymentName;
  }

  set deploymentName(deploymentName: string | null) {
    this._deploymentName = deploymentName ?? null;
  }

  get microsoftFoundryServiceVersion(): unknown {
    return this._microsoftFoundryServiceVersion;
  }

  set microsoftFoundryServiceVersion(microsoftFoundryServiceVersion: unknown) {
    this._microsoftFoundryServiceVersion = microsoftFoundryServiceVersion;
  }

  get organizationId(): string | null {
    return this._organizationId;
  }

  set organizationId(organizationId: string | null) {
    this._organizationId = organizationId ?? null;
  }

  get microsoftFoundry(): boolean {
    return this._microsoftFoundry;
  }

  set microsoftFoundry(microsoftFoundry: boolean) {
    this._microsoftFoundry = microsoftFoundry;
  }

  get gitHubModels(): boolean {
    return this._gitHubModels;
  }

  set gitHubModels(gitHubModels: boolean) {
    this._gitHubModels = gitHubModels;
  }

  get timeout(): unknown {
    return this._timeout;
  }

  set timeout(timeout: unknown) {
    this._timeout = timeout;
  }

  get maxRetries(): number | null {
    return this._maxRetries;
  }

  set maxRetries(maxRetries: number | null) {
    this._maxRetries = maxRetries ?? null;
  }

  get proxy(): unknown {
    return this._proxy;
  }

  set proxy(proxy: unknown) {
    this._proxy = proxy;
  }

  get customHeaders(): Record<string, string> {
    return this._customHeaders;
  }

  set customHeaders(customHeaders: Record<string, string> | null) {
    this._customHeaders = { ...(customHeaders ?? {}) };
  }
}
